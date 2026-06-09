"""
fix_phonetics_db.py -- Remove duplicate rows, then re-compute phonetic fields.

Step 1: Delete duplicate (word, language, pos) rows — skipped unless --dedup
        is passed (avoids an expensive full-table window scan when not needed).
Step 2: Drop the five non-key indexes on the columns being updated so that the
        bulk UPDATE does not pay per-row index maintenance and so that any
        corrupted index pages are discarded.  The indexes are recreated at the
        end of the step.  Pass --no-rebuild-indexes to skip this if you know
        all indexes are healthy and want a faster incremental run.
Step 3: Re-compute stress_pattern, syllable_count, meter, rhyme_part for every
        row with a non-null `ipa` using keyset pagination + two connections.
        Language is fetched alongside IPA so that words in stress-capable
        languages whose IPA carries no stress markers can receive a
        syllable-count-based meter fallback (trochee / dactyl).

Usage:
    python fix_phonetics_db.py                    # full safe run (rebuilds indexes)
    python fix_phonetics_db.py --dedup            # also remove duplicates first
    python fix_phonetics_db.py --no-rebuild-indexes  # skip drop/recreate (faster if indexes healthy)
"""
from __future__ import annotations
import io, os, sys, argparse
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import psycopg2
from psycopg2.extras import execute_batch
from phonetics import (
    classify_meter,
    extract_rhyme_part,
    extract_stress_pattern,
    STRESS_FREE_LANGS,
)

parser = argparse.ArgumentParser()
parser.add_argument("--dedup", action="store_true", help="Run duplicate-removal step")
parser.add_argument(
    "--no-rebuild-indexes",
    action="store_true",
    help="Skip dropping/recreating non-key indexes. Faster if indexes are known-healthy.",
)
args = parser.parse_args()

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:Kronleuchter1!@localhost:5432/rhymes",
)
BATCH = 2000

read_conn  = psycopg2.connect(DB_URL)
write_conn = psycopg2.connect(DB_URL)

# ---------------------------------------------------------------------------
# Step 1: delete duplicates — window function scans table once (O(n log n))
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Step 1: delete duplicates — only runs when --dedup flag is passed, because
# the window-function DELETE requires a full O(n log n) table scan and is
# very slow on large tables.  If the DB is already clean, skip it.
# ---------------------------------------------------------------------------
if args.dedup:
    print("Step 1: checking for duplicate rows ...", flush=True)
    # Fast duplicate check: GROUP BY + HAVING stops on the first hit.
    with write_conn.cursor() as cur:
        cur.execute("""
            SELECT 1 FROM words
            GROUP BY word, language, pos
            HAVING COUNT(*) > 1
            LIMIT 1
        """)
        has_dups = cur.fetchone() is not None
    write_conn.rollback()

    if not has_dups:
        print("  No duplicates found — skipping DELETE.", flush=True)
    else:
        print("  Duplicates found, removing ...", flush=True)
        with write_conn.cursor() as cur:
            cur.execute("""
                DELETE FROM words
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id,
                               ROW_NUMBER() OVER (
                                   PARTITION BY word, language, pos
                                   ORDER BY id DESC
                               ) AS rn
                        FROM words
                    ) ranked
                    WHERE rn > 1
                )
            """)
            deleted = cur.rowcount
        write_conn.commit()
        print(f"  Deleted {deleted:,} duplicate rows.", flush=True)
else:
    print("Step 1: skipped (pass --dedup to run duplicate removal).", flush=True)

# ---------------------------------------------------------------------------
# Step 2: drop non-key indexes on updated columns before bulk UPDATE, recreate
# after.  This avoids per-row B-tree maintenance overhead and discards any
# corrupted pages (e.g. idx_rhyme_cross) by rebuilding from the clean heap.
# ---------------------------------------------------------------------------

# These are the five btree indexes that cover columns we rewrite in Step 3.
# We fetch their current CREATE INDEX SQL from the catalog so we can recreate
# them exactly as they were.
_MANAGED_INDEXES = [
    "idx_rhyme_cross",
    "idx_rhyme_lang",
    "idx_stress",
    "idx_syllables",
    "idx_meter",
]

if args.no_rebuild_indexes:
    print("Step 2: skipped index rebuild (--no-rebuild-indexes).", flush=True)
    _index_defs: dict[str, str] = {}  # nothing to recreate
else:
    print("Step 2: dropping non-key indexes to speed up bulk UPDATE ...", flush=True)
    with write_conn.cursor() as cur:
        cur.execute(
            "SELECT indexname, indexdef FROM pg_indexes "
            "WHERE tablename = 'words' AND indexname = ANY(%s)",
            (_MANAGED_INDEXES,),
        )
        _index_defs = {row[0]: row[1] for row in cur.fetchall()}
    write_conn.rollback()

    for idx in _MANAGED_INDEXES:
        if idx not in _index_defs:
            print(f"  {idx}: not found, skipping.", flush=True)
            continue
        with write_conn.cursor() as cur:
            cur.execute(f"DROP INDEX IF EXISTS {idx}")
        write_conn.commit()
        print(f"  Dropped {idx}.", flush=True)

# ---------------------------------------------------------------------------
# Step 3: re-compute phonetic fields via keyset pagination.
# Fetches language alongside ipa so that words in stress-capable languages
# whose IPA carries no stress markers can get a syllable-count fallback meter.
# ---------------------------------------------------------------------------
with read_conn.cursor() as cur:
    cur.execute("SELECT COUNT(*) FROM words WHERE ipa IS NOT NULL")
    total = cur.fetchone()[0]
read_conn.rollback()
print(f"Step 3: reprocessing {total:,} rows ...", flush=True)

UPDATE_SQL = """
    UPDATE words
       SET stress_pattern = %s,
           syllable_count = %s,
           meter          = %s,
           rhyme_part     = %s
     WHERE id = %s
"""

processed = 0
last_id = 0

while True:
    with read_conn.cursor() as rcur:
        rcur.execute(
            "SELECT id, ipa, language FROM words WHERE ipa IS NOT NULL AND id > %s ORDER BY id LIMIT %s",
            (last_id, BATCH),
        )
        rows = rcur.fetchall()
    read_conn.rollback()

    if not rows:
        break

    updates = []
    for row_id, ipa, language in rows:
        try:
            pattern, syl_count = extract_stress_pattern(ipa)
            meter = classify_meter(pattern)

            # Fallback for stress-capable languages whose IPA has no stress
            # markers (pattern is all zeros or None).  For 2-syllable words
            # only: default to trochee since initial stress is the dominant
            # pattern in most stress-capable languages.  3-syllable words
            # have too many possible feet (dactyl/anapest/amphibrach) to
            # guess reliably — leave them NULL rather than assign wrong data.
            if meter is None and syl_count == 2 and language not in STRESS_FREE_LANGS:
                meter = "trochee"

            updates.append((
                pattern,
                syl_count if syl_count and syl_count > 0 else None,
                meter,
                extract_rhyme_part(ipa),
                row_id,
            ))
        except Exception as exc:
            print(f"  WARNING: skipping row {row_id} (ipa={ipa!r}): {exc}", flush=True)

    if not updates:
        last_id = rows[-1][0]
        processed += len(rows)
        continue

    try:
        with write_conn.cursor() as wcur:
            execute_batch(wcur, UPDATE_SQL, updates, page_size=500)
        write_conn.commit()
    except Exception as batch_exc:
        write_conn.rollback()
        # Retry row-by-row so one bad row doesn't lose the whole batch.
        # Index corruption errors should not occur here if Step 2 ran;
        # if they do, abort immediately rather than silently skipping data.
        skipped_batch = 0
        with write_conn.cursor() as wcur:
            for params in updates:
                wcur.execute("SAVEPOINT sp")
                try:
                    wcur.execute(UPDATE_SQL, params)
                    wcur.execute("RELEASE SAVEPOINT sp")
                except Exception as exc:
                    wcur.execute("ROLLBACK TO SAVEPOINT sp")
                    exc_str = str(exc)
                    if "index" in exc_str.lower() and (
                        "corrupt" in exc_str.lower()
                        or "cannot find insert offset" in exc_str.lower()
                        or "overlaps with invalid" in exc_str.lower()
                    ):
                        write_conn.rollback()
                        read_conn.close()
                        write_conn.close()
                        print(
                            f"\nFATAL: Index corruption detected on row id={params[-1]}\n"
                            f"  {exc_str.strip()}\n"
                            "  Re-run without --no-rebuild-indexes to drop and recreate"
                            " the affected indexes.",
                            flush=True,
                        )
                        sys.exit(1)
                    skipped_batch += 1
                    print(f"  WARNING: skipped row id={params[-1]}: {exc}", flush=True)
        write_conn.commit()
        if skipped_batch:
            print(f"  (skipped {skipped_batch} rows in this batch)", flush=True)

    processed += len(rows)
    last_id = rows[-1][0]
    if processed % 50_000 < BATCH:
        print(f"  {processed:>9,} / {total:,} rows ...", flush=True)

read_conn.close()
write_conn.close()

# ---------------------------------------------------------------------------
# Recreate the indexes that were dropped in Step 2.
# ---------------------------------------------------------------------------
if not args.no_rebuild_indexes and _index_defs:
    print("\nRebuilding indexes ...", flush=True)
    # Use a fresh autocommit connection — CREATE INDEX cannot run inside a
    # transaction block, and CONCURRENTLY requires it.
    idx_conn = psycopg2.connect(DB_URL)
    idx_conn.autocommit = True
    with idx_conn.cursor() as cur:
        for idx, ddl in _index_defs.items():
            print(f"  Creating {idx} ...", flush=True)
            cur.execute(ddl)
            print(f"  {idx} done.", flush=True)
    idx_conn.close()

print(f"\nDone. {processed:,} rows updated.", flush=True)

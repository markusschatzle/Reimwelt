"""
fix_missing_phonetics.py — Two-phase repair for missing IPA and rhyme_part.

Phase 2 (slow, eSpeak):
    Call eSpeak-NG for every word with ipa IS NULL.
    Skips multiword entries and abbreviations.  Can be disabled with --no-espeak.

Phase 3 (fast, pure-Python):
    For every word that has a non-NULL ipa but a NULL rhyme_part (or NULL
    stress_pattern / syllable_count / meter), recompute those fields from the
    stored IPA string.

Usage:
    python fix_missing_phonetics.py                   # all languages, both phases
    python fix_missing_phonetics.py --langs de en     # specific languages only
    python fix_missing_phonetics.py --no-espeak       # skip phase 2 (eSpeak)
    python fix_missing_phonetics.py --phase3-only     # only fix downstream fields
    python fix_missing_phonetics.py --dry-run         # counts only, no writes
    python fix_missing_phonetics.py --batch 200       # smaller batches (default 500)
    python fix_missing_phonetics.py --limit 5000      # cap rows per lang (testing)
"""
from __future__ import annotations

import argparse
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from dotenv import load_dotenv
load_dotenv()

import psycopg2
import psycopg2.extras

from phonetics import (
    ESPEAK_AVAILABLE,
    call_espeak,
    classify_meter,
    extract_rhyme_part,
    extract_stress_pattern,
)

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

parser = argparse.ArgumentParser(
    description="Repair NULL ipa and rhyme_part rows."
)
parser.add_argument(
    "--langs",
    nargs="+",
    default=None,
    help="Language codes to process (default: every language with at least one NULL-ipa row).",
)
parser.add_argument(
    "--batch",
    type=int,
    default=500,
    help="DB read/write batch size (default: 500).",
)
parser.add_argument(
    "--no-espeak",
    action="store_true",
    help="Skip phase 2 (eSpeak generation).",
)
parser.add_argument(
    "--phase3-only",
    action="store_true",
    help="Skip phase 2 (IPA repair). Only backfill missing downstream fields.",
)
parser.add_argument(
    "--dry-run",
    action="store_true",
    help="Count eligible rows but do not write anything.",
)
parser.add_argument(
    "--limit",
    type=int,
    default=None,
    help="Stop after this many rows per language (useful for testing).",
)
args = parser.parse_args()

# ---------------------------------------------------------------------------
# DB connections
# ---------------------------------------------------------------------------

DB_URL = os.environ.get("DATABASE_URL", "")
if not DB_URL:
    print("ERROR: DATABASE_URL environment variable is not set.", file=sys.stderr)
    sys.exit(1)

read_conn  = psycopg2.connect(DB_URL)
write_conn = psycopg2.connect(DB_URL)

# ---------------------------------------------------------------------------
# SQL templates
# ---------------------------------------------------------------------------

# Phase 2: eSpeak — ipa_raw is left untouched.
UPDATE_ESPEAK_SQL = """
UPDATE words
   SET ipa            = %(ipa)s,
       ipa_source     = 'espeak',
       rhyme_part     = %(rhyme_part)s,
       stress_pattern = %(stress_pattern)s,
       syllable_count = %(syllable_count)s,
       meter          = %(meter)s
 WHERE id = %(id)s
   AND ipa IS NULL
"""

# Phase 3: fill downstream fields for words that already have IPA.
UPDATE_RHYME_PART_SQL = """
UPDATE words
   SET rhyme_part     = %(rhyme_part)s,
       stress_pattern = %(stress_pattern)s,
       syllable_count = %(syllable_count)s,
       meter          = %(meter)s
 WHERE id = %(id)s
   AND ipa IS NOT NULL
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def derive_phonetics(ipa: str) -> dict:
    """Derive all phonetic derivative fields from a cleaned IPA string."""
    rhyme_part = extract_rhyme_part(ipa)
    pattern, syl_count = extract_stress_pattern(ipa)
    meter = classify_meter(pattern)
    return {
        "rhyme_part":     rhyme_part,
        "stress_pattern": pattern,
        "syllable_count": syl_count if syl_count and syl_count > 0 else None,
        "meter":          meter,
    }


_INDEX_CORRUPTION_ERRORS = (
    psycopg2.errors.IndexCorrupted,
    psycopg2.errors.InternalError_,
)

_AFFECTED_INDEXES = [
    "idx_rhyme_cross",
    "idx_rhyme_lang",
    "idx_stress",
    "idx_syllables",
    "idx_meter",
]


def reindex_if_corrupted(index_name: str) -> None:
    """Roll back current write transaction, then DROP+CREATE all affected indexes."""
    print(f"\n  [REINDEX] Index corruption detected ({index_name}) — rebuilding all affected indexes ...", flush=True)
    write_conn.rollback()
    write_conn.autocommit = True
    ddl = {
        "idx_rhyme_cross": "CREATE INDEX idx_rhyme_cross ON public.words USING btree (rhyme_part)",
        "idx_rhyme_lang":  "CREATE INDEX idx_rhyme_lang  ON public.words USING btree (language, rhyme_part)",
        "idx_stress":      "CREATE INDEX idx_stress       ON public.words USING btree (language, stress_pattern)",
        "idx_syllables":   "CREATE INDEX idx_syllables    ON public.words USING btree (language, syllable_count)",
        "idx_meter":       "CREATE INDEX idx_meter        ON public.words USING btree (language, meter)",
    }
    try:
        with write_conn.cursor() as cur:
            for name in _AFFECTED_INDEXES:
                cur.execute(f"DROP INDEX IF EXISTS {name}")
                print(f"  [REINDEX] dropped {name}", flush=True)
            for name, create_sql in ddl.items():
                cur.execute(create_sql)
                print(f"  [REINDEX] created {name}", flush=True)
        print(f"  [REINDEX] All indexes rebuilt successfully.", flush=True)
    finally:
        write_conn.autocommit = False


def get_target_langs() -> list[str]:
    """Return the list of language codes that still have NULL-ipa rows."""
    if args.langs:
        return list(args.langs)
    with read_conn.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT language FROM words WHERE ipa IS NULL ORDER BY language"
        )
        langs = [r[0] for r in cur.fetchall()]
    read_conn.rollback()
    return langs


# ---------------------------------------------------------------------------
# Phase 2 — eSpeak for NULL-ipa rows
# ---------------------------------------------------------------------------

def phase2_lang(lang: str) -> tuple[int, int, int]:
    """
    Call eSpeak-NG for every word still with ipa IS NULL in *lang*.
    Skips multiword entries and abbreviations.

    Returns (rows_read, rows_updated, rows_skipped_no_ipa).
    """
    if not ESPEAK_AVAILABLE:
        print(f"  [phase2/{lang}] eSpeak-NG not available, skipping.", flush=True)
        return 0, 0, 0

    with read_conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*)
            FROM words
            WHERE language = %s
              AND ipa IS NULL
              AND is_multiword = FALSE
              AND is_abbreviation = FALSE
            """,
            (lang,),
        )
        total = cur.fetchone()[0]
    read_conn.rollback()

    if args.limit is not None:
        total = min(total, args.limit)

    print(f"  [phase2/{lang}] {total:,} single-word rows still need eSpeak.", flush=True)

    if total == 0 or args.dry_run:
        return total, 0, 0

    rows_read    = 0
    rows_updated = 0
    rows_skipped = 0
    last_id      = 0

    while True:
        if args.limit is not None and rows_read >= args.limit:
            break

        batch_size = args.batch
        if args.limit is not None:
            batch_size = min(args.batch, args.limit - rows_read)

        with read_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, word
                FROM words
                WHERE language = %s
                  AND ipa IS NULL
                  AND is_multiword = FALSE
                  AND is_abbreviation = FALSE
                  AND id > %s
                ORDER BY id
                LIMIT %s
                """,
                (lang, last_id, batch_size),
            )
            batch = cur.fetchall()
        read_conn.rollback()

        if not batch:
            break

        updates = []
        for row in batch:
            word_id = row["id"]
            word    = row["word"]
            last_id = word_id
            rows_read += 1

            ipa = call_espeak(word, lang)
            if not ipa:
                rows_skipped += 1
                continue

            updates.append({
                "id":  word_id,
                "ipa": ipa,
                **derive_phonetics(ipa),
            })

        if updates:
            for attempt in range(3):
                try:
                    with write_conn.cursor() as wcur:
                        for row_params in updates:
                            wcur.execute(UPDATE_ESPEAK_SQL, row_params)
                    write_conn.commit()
                    rows_updated += len(updates)
                    break
                except _INDEX_CORRUPTION_ERRORS:
                    if attempt < 2:
                        reindex_if_corrupted("idx_rhyme_cross")
                    else:
                        write_conn.rollback()
                        print(f"\n  [phase2/{lang}] Index corruption persists after 3 reindex attempts — skipping batch.", flush=True)

        pct = rows_read / total * 100 if total else 0
        print(
            f"  [phase2/{lang}] {rows_read:>7,} / {total:,} ({pct:.1f}%)"
            f"  updated={rows_updated:,}  no_ipa={rows_skipped:,}",
            end="\r", flush=True,
        )

    print(flush=True)
    return rows_read, rows_updated, rows_skipped


# ---------------------------------------------------------------------------
# Phase 3 — backfill rhyme_part (and sibling fields) from existing IPA
# ---------------------------------------------------------------------------

_INDEX_DDL = {
    "idx_rhyme_cross": "CREATE INDEX idx_rhyme_cross ON public.words USING btree (rhyme_part)",
    "idx_rhyme_lang":  "CREATE INDEX idx_rhyme_lang  ON public.words USING btree (language, rhyme_part)",
    "idx_stress":      "CREATE INDEX idx_stress       ON public.words USING btree (language, stress_pattern)",
    "idx_syllables":   "CREATE INDEX idx_syllables    ON public.words USING btree (language, syllable_count)",
    "idx_meter":       "CREATE INDEX idx_meter        ON public.words USING btree (language, meter)",
}


def drop_phonetic_indexes() -> None:
    write_conn.rollback()
    write_conn.autocommit = True
    try:
        with write_conn.cursor() as cur:
            for name in _INDEX_DDL:
                cur.execute(f"DROP INDEX IF EXISTS {name}")
                print(f"  [index] dropped {name}", flush=True)
    finally:
        write_conn.autocommit = False


def recreate_phonetic_indexes() -> None:
    write_conn.rollback()
    write_conn.autocommit = True
    try:
        with write_conn.cursor() as cur:
            for name, ddl in _INDEX_DDL.items():
                print(f"  [index] creating {name} ...", flush=True)
                cur.execute(ddl)
                print(f"  [index] {name} created.", flush=True)
    finally:
        write_conn.autocommit = False


def phase3() -> tuple[int, int]:
    """
    For every word that has ipa IS NOT NULL but rhyme_part IS NULL (or any of
    stress_pattern / syllable_count / meter is NULL), recompute those fields
    purely from the stored IPA string.

    Drops all phonetic indexes before the bulk update and recreates them
    afterwards — this avoids repeated index corruption on large datasets.

    Returns (rows_read, rows_updated).
    """
    with read_conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*)
            FROM words
            WHERE ipa IS NOT NULL
              AND (
                    rhyme_part     IS NULL
                 OR stress_pattern IS NULL
                 OR syllable_count IS NULL
                 OR meter          IS NULL
              )
            """
        )
        total = cur.fetchone()[0]
    read_conn.rollback()

    print(f"\n=== Phase 3: backfill rhyme_part from existing IPA ===", flush=True)
    print(f"  {total:,} rows with ipa but missing downstream fields.", flush=True)

    if total == 0:
        print("  Nothing to do.", flush=True)
        return 0, 0

    if args.dry_run:
        return total, 0

    print("  Dropping phonetic indexes for bulk update ...", flush=True)
    drop_phonetic_indexes()

    rows_read    = 0
    rows_updated = 0
    last_id      = 0

    while True:
        with read_conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, ipa
                FROM words
                WHERE ipa IS NOT NULL
                  AND (
                        rhyme_part     IS NULL
                     OR stress_pattern IS NULL
                     OR syllable_count IS NULL
                     OR meter          IS NULL
                  )
                  AND id > %s
                ORDER BY id
                LIMIT %s
                """,
                (last_id, args.batch),
            )
            batch = cur.fetchall()
        read_conn.rollback()

        if not batch:
            break

        updates = []
        for row_id, ipa in batch:
            last_id   = row_id
            rows_read += 1
            phon = derive_phonetics(ipa)
            updates.append({"id": row_id, **phon})

        if updates:
            with write_conn.cursor() as wcur:
                for row_params in updates:
                    wcur.execute(UPDATE_RHYME_PART_SQL, row_params)
            write_conn.commit()
            rows_updated += len(updates)

        pct = rows_read / total * 100 if total else 0
        print(
            f"  [phase3] {rows_read:>7,} / {total:,} ({pct:.1f}%)"
            f"  updated={rows_updated:,}",
            end="\r", flush=True,
        )

    print(flush=True)
    print("  Recreating phonetic indexes ...", flush=True)
    recreate_phonetic_indexes()
    return rows_read, rows_updated


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if args.dry_run:
    print("DRY RUN — counts only, no writes.")

if not args.phase3_only:
    target_langs = get_target_langs()

    if not target_langs:
        print("No languages with NULL ipa found. Skipping phase 2.")
    else:
        print(f"Languages to repair: {target_langs}")

        if not args.no_espeak:
            print("\n=== Phase 2: eSpeak generation for NULL-ipa rows ===")
            if not ESPEAK_AVAILABLE:
                print(
                    "WARNING: eSpeak-NG is not installed — phase 2 will be skipped per language.\n"
                    "Install with: choco install espeak  |  apt install espeak-ng",
                    file=sys.stderr,
                )
            p2_read = p2_updated = p2_skipped = 0
            for lang in target_langs:
                r, u, s = phase2_lang(lang)
                p2_read    += r
                p2_updated += u
                p2_skipped += s
            print(
                f"\nPhase 2 complete.  "
                f"Read={p2_read:,}  Updated={p2_updated:,}  No-IPA={p2_skipped:,}"
            )

# ------------------------------------------------------------------
# Phase 3: backfill rhyme_part from existing IPA
# ------------------------------------------------------------------
p3_read, p3_updated = phase3()
print(f"\nPhase 3 complete.  Read={p3_read:,}  Updated={p3_updated:,}")

print("\nAll done.")
read_conn.close()
write_conn.close()

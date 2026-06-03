"""
fix_null_ipa.py — Two-phase IPA repair for words with ipa IS NULL.

Phase 1 (fast, DB-only):
    Re-inspect the raw_kaikki JSONB column for every NULL-ipa word.
    Many rows have IPA data in raw_kaikki['sounds'] that was never propagated
    into the ipa column (e.g. ETL interrupted, eSpeak unavailable at import
    time, or early-exit bug in the sounds loop).
    Runs through get_authoritative_ipa so stress markers are added via eSpeak
    for de/en if kaikki IPA lacks them.

Phase 2 (slow, eSpeak):
    For words still missing IPA after phase 1, call eSpeak-NG directly.
    Skips multiword entries and abbreviations (eSpeak produces unreliable
    output for those).  All other languages are attempted.
    Expected runtime: 2–3 h for large (100 k+) vocabularies.

Usage:
    python fix_null_ipa.py                    # all languages, both phases
    python fix_null_ipa.py --langs de en      # specific languages only
    python fix_null_ipa.py --no-espeak        # phase 1 only (fast DB recovery)
    python fix_null_ipa.py --dry-run          # counts only, no writes
    python fix_null_ipa.py --batch 200        # smaller batches (default 500)
    python fix_null_ipa.py --limit 5000       # cap rows per lang (testing)
"""
from __future__ import annotations

import argparse
import io
import json
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
    clean_ipa,
    extract_rhyme_part,
    extract_stress_pattern,
    get_authoritative_ipa,
)

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

parser = argparse.ArgumentParser(
    description="Repair NULL ipa rows: phase 1 from raw_kaikki, phase 2 via eSpeak."
)
parser.add_argument(
    "--langs",
    nargs="+",
    default=None,
    help=(
        "Language codes to process (default: every language that has "
        "at least one NULL-ipa row in the DB)."
    ),
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
    help="Skip phase 2 (eSpeak generation). Only recover from raw_kaikki.",
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
# UPDATE SQL
# ---------------------------------------------------------------------------

# Phase 1: we may also fill ipa_raw if it was previously NULL.
UPDATE_FROM_RAW_SQL = """
UPDATE words
   SET ipa            = %(ipa)s,
       ipa_raw        = COALESCE(ipa_raw, %(ipa_raw)s),
       ipa_source     = %(ipa_source)s,
       rhyme_part     = %(rhyme_part)s,
       stress_pattern = %(stress_pattern)s,
       syllable_count = %(syllable_count)s,
       meter          = %(meter)s
 WHERE id = %(id)s
   AND ipa IS NULL
"""

# Phase 2: eSpeak has no kaikki raw IPA; ipa_raw is left untouched.
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


def extract_ipa_from_sounds(raw_kaikki: dict) -> str | None:
    """
    Scan every entry in raw_kaikki['sounds'] for an 'ipa' key and return
    the first non-empty cleaned IPA string found, or None.

    Covers the ETL early-exit bug: the original loop stopped as soon as
    audio_url was also found, potentially missing IPA entries that appear
    later in the sounds array.
    """
    for sound in raw_kaikki.get("sounds", []):
        raw_ipa = sound.get("ipa")
        if raw_ipa:
            cleaned = clean_ipa(str(raw_ipa))
            if cleaned:
                return cleaned
    return None


def get_target_langs() -> list[str]:
    """Return the list of language codes to process."""
    if args.langs:
        return list(args.langs)
    with read_conn.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT language FROM words WHERE ipa IS NULL ORDER BY language"
        )
        langs = [r[0] for r in cur.fetchall()]
    read_conn.rollback()
    return langs


def reindex_if_corrupted(index_name: str) -> None:
    """
    Roll back the current write transaction, then REINDEX the named index
    using autocommit (REINDEX cannot run inside a transaction block).
    Raises if the reindex itself fails.
    """
    print(
        f"\n  [REINDEX] Index corruption detected — reindexing {index_name} ...",
        flush=True,
    )
    write_conn.rollback()
    write_conn.autocommit = True
    try:
        with write_conn.cursor() as cur:
            cur.execute(f"REINDEX INDEX {index_name}")
        print(f"  [REINDEX] {index_name} reindexed successfully.", flush=True)
    finally:
        write_conn.autocommit = False


# ---------------------------------------------------------------------------
# Phase 1 — recover IPA from raw_kaikki
# ---------------------------------------------------------------------------

def phase1_lang(lang: str) -> tuple[int, int]:
    """
    For words with ipa IS NULL and raw_kaikki present, check raw_kaikki['sounds']
    for IPA data and propagate it.

    Returns (rows_checked, rows_recovered).
    """
    with read_conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*)
            FROM words
            WHERE language = %s
              AND ipa IS NULL
              AND raw_kaikki IS NOT NULL
            """,
            (lang,),
        )
        total = cur.fetchone()[0]
    read_conn.rollback()

    if args.limit is not None:
        total = min(total, args.limit)

    print(
        f"  [phase1/{lang}] {total:,} rows with ipa IS NULL and raw_kaikki present.",
        flush=True,
    )

    if total == 0 or args.dry_run:
        return total, 0

    rows_checked = 0
    rows_recovered = 0
    last_id = 0

    while True:
        if args.limit is not None and rows_checked >= args.limit:
            break

        batch_size = args.batch
        if args.limit is not None:
            batch_size = min(args.batch, args.limit - rows_checked)

        with read_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, word, language, ipa_raw, raw_kaikki
                FROM words
                WHERE language = %s
                  AND ipa IS NULL
                  AND raw_kaikki IS NOT NULL
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
            word_id    = row["id"]
            word       = row["word"]
            row_lang   = row["language"]
            ipa_raw_db = row["ipa_raw"]   # may be NULL
            raw_blob   = row["raw_kaikki"]

            last_id = word_id
            rows_checked += 1

            # psycopg2 auto-parses JSONB into a Python dict; fall back to
            # json.loads() if for some reason it comes back as a string.
            raw_dict = raw_blob if isinstance(raw_blob, dict) else json.loads(raw_blob)

            # Prefer the already-stored ipa_raw; if it's NULL, scan sounds[].
            kaikki_ipa = ipa_raw_db or extract_ipa_from_sounds(raw_dict)
            if not kaikki_ipa:
                continue  # raw_kaikki has no IPA at all

            ipa, ipa_source = get_authoritative_ipa(kaikki_ipa, word, row_lang)
            if not ipa:
                continue  # get_authoritative_ipa returned None (e.g. stress-free with no ipa)

            updates.append({
                "id":         word_id,
                "ipa":        ipa,
                "ipa_raw":    kaikki_ipa,  # back-fills ipa_raw if it was NULL
                "ipa_source": ipa_source,
                **derive_phonetics(ipa),
            })

        if updates:
            for attempt in range(3):
                try:
                    with write_conn.cursor() as wcur:
                        for row_params in updates:
                            wcur.execute(UPDATE_FROM_RAW_SQL, row_params)
                    write_conn.commit()
                    rows_recovered += len(updates)
                    break
                except psycopg2.errors.IndexCorrupted:
                    if attempt < 2:
                        reindex_if_corrupted("idx_rhyme_cross")
                    else:
                        write_conn.rollback()
                        print(f"\n  [phase1/{lang}] Index corruption persists after 3 reindex attempts — skipping batch.", flush=True)

        pct = rows_checked / total * 100 if total else 0
        print(
            f"  [phase1/{lang}] {rows_checked:>7,} / {total:,} ({pct:.1f}%)"
            f"  recovered={rows_recovered:,}",
            end="\r",
            flush=True,
        )

    print(flush=True)
    return rows_checked, rows_recovered


# ---------------------------------------------------------------------------
# Phase 2 — eSpeak fallback
# ---------------------------------------------------------------------------

def phase2_lang(lang: str) -> tuple[int, int, int]:
    """
    Call eSpeak-NG for every word still with ipa IS NULL in *lang*.
    Skips multiword entries and abbreviations.

    Returns (rows_read, rows_updated, rows_skipped_no_ipa).
    """
    if not ESPEAK_AVAILABLE:
        print(
            f"  [phase2/{lang}] eSpeak-NG not available, skipping.", flush=True
        )
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

    print(
        f"  [phase2/{lang}] {total:,} single-word rows still need eSpeak.", flush=True
    )

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
                except psycopg2.errors.IndexCorrupted:
                    if attempt < 2:
                        reindex_if_corrupted("idx_rhyme_cross")
                    else:
                        write_conn.rollback()
                        print(f"\n  [phase2/{lang}] Index corruption persists after 3 reindex attempts — skipping batch.", flush=True)

        pct = rows_read / total * 100 if total else 0
        print(
            f"  [phase2/{lang}] {rows_read:>7,} / {total:,} ({pct:.1f}%)"
            f"  updated={rows_updated:,}  no_ipa={rows_skipped:,}",
            end="\r",
            flush=True,
        )

    print(flush=True)
    return rows_read, rows_updated, rows_skipped


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

target_langs = get_target_langs()

if not target_langs:
    print("No languages with NULL ipa found. Nothing to do.")
    read_conn.close()
    write_conn.close()
    sys.exit(0)

print(f"Languages to repair: {target_langs}")
if args.dry_run:
    print("DRY RUN — counts only, no writes.")
if args.no_espeak:
    print("Phase 2 (eSpeak) disabled via --no-espeak.")

# ------------------------------------------------------------------
# Phase 1: recover from raw_kaikki
# ------------------------------------------------------------------
print("\n=== Phase 1: recover IPA from raw_kaikki ===")
p1_checked = p1_recovered = 0
for lang in target_langs:
    checked, recovered = phase1_lang(lang)
    p1_checked   += checked
    p1_recovered += recovered

print(
    f"\nPhase 1 complete.  "
    f"Checked={p1_checked:,}  Recovered={p1_recovered:,}"
)

# ------------------------------------------------------------------
# Phase 2: eSpeak for remaining NULL rows
# ------------------------------------------------------------------
if not args.no_espeak:
    print("\n=== Phase 2: eSpeak generation for remaining NULL-ipa rows ===")
    if not ESPEAK_AVAILABLE:
        print(
            "WARNING: eSpeak-NG is not installed.  "
            "Install with: apt install espeak-ng  |  choco install espeak",
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

print("\nAll done.")
read_conn.close()
write_conn.close()

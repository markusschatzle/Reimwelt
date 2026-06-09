"""
backfill_espeak_ipa.py — Populate IPA via eSpeak for words that have ipa IS NULL.

During the original ETL run, eSpeak-NG was unavailable (or not installed), so
~60 % of German words and ~62 % of English words ended up with ipa=NULL and
rhyme_part=NULL.  The rhyme search SQL uses:

    WHERE rhyme_part LIKE '%' || <suffix>

…which can only match rows that already have a non-NULL rhyme_part, causing
large swathes of the vocabulary to be invisible to the search engine.

This script fills the gap by:
  1. Fetching NULL-ipa words in ESPEAK_USEFUL_LANGS in batches (keyset pagination).
  2. Calling eSpeak for each word.
  3. Deriving rhyme_part / stress_pattern / syllable_count / meter from the IPA.
  4. Writing the results back to the DB in a bulk UPDATE.

Skips:
  - Multiword entries (spaces in the word): eSpeak gives phrase-level prosody,
    not the single-word IPA the rhyme engine expects.
  - Abbreviations (is_abbreviation = TRUE): too many acronym-style pronunciations.
  - Words where eSpeak returns nothing (stored with ipa_source='none', no change).

Usage:
    python backfill_espeak_ipa.py                     # de + en, all words
    python backfill_espeak_ipa.py --langs de          # German only
    python backfill_espeak_ipa.py --langs de --limit 50000  # first 50 K rows
    python backfill_espeak_ipa.py --dry-run           # show counts, do not write
"""
from __future__ import annotations

import argparse
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from dotenv import load_dotenv
load_dotenv()

import psycopg2
import psycopg2.extras
from psycopg2.extras import execute_batch

from phonetics import (
    ESPEAK_USEFUL_LANGS,
    call_espeak,
    classify_meter,
    extract_rhyme_part,
    extract_stress_pattern,
    ESPEAK_AVAILABLE,
)

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

parser = argparse.ArgumentParser(description="Backfill eSpeak IPA for NULL-ipa words.")
parser.add_argument(
    "--langs",
    nargs="+",
    default=sorted(ESPEAK_USEFUL_LANGS),
    help="Language codes to process (default: all ESPEAK_USEFUL_LANGS).",
)
parser.add_argument(
    "--limit",
    type=int,
    default=None,
    help="Stop after processing this many rows (useful for testing).",
)
parser.add_argument(
    "--batch",
    type=int,
    default=500,
    help="DB batch size for reads and writes (default: 500).",
)
parser.add_argument(
    "--dry-run",
    action="store_true",
    help="Count eligible rows but do not write anything.",
)
args = parser.parse_args()

if not ESPEAK_AVAILABLE:
    print("ERROR: eSpeak-NG is not available.  Install espeak-ng and retry.", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# DB connections (separate read / write to avoid locking issues during long runs)
# ---------------------------------------------------------------------------

DB_URL = os.environ.get("DATABASE_URL", "")
if not DB_URL:
    print("ERROR: DATABASE_URL environment variable is not set.", file=sys.stderr)
    sys.exit(1)

read_conn  = psycopg2.connect(DB_URL)
write_conn = psycopg2.connect(DB_URL)

# ---------------------------------------------------------------------------
# Update SQL
# ---------------------------------------------------------------------------

UPDATE_SQL = """
UPDATE words
   SET ipa          = %(ipa)s,
       ipa_source   = 'espeak',
       rhyme_part   = %(rhyme_part)s,
       stress_pattern = %(stress_pattern)s,
       syllable_count = %(syllable_count)s,
       meter        = %(meter)s
 WHERE id = %(id)s
   AND ipa IS NULL
"""

# ---------------------------------------------------------------------------
# Per-language helper
# ---------------------------------------------------------------------------

def process_language(lang: str) -> tuple[int, int, int]:
    """
    Backfill eSpeak IPA for all eligible NULL-ipa rows in *lang*.

    Returns (rows_read, rows_updated, rows_skipped).
    """
    # Count rows to process
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

    print(f"\n[{lang}] {total:,} eligible NULL-ipa rows to process.", flush=True)

    if args.dry_run or total == 0:
        return total, 0, 0

    rows_read = 0
    rows_updated = 0
    rows_skipped = 0
    last_id = 0
    batch_size = args.batch

    while True:
        if args.limit is not None and rows_read >= args.limit:
            break

        current_batch = batch_size
        if args.limit is not None:
            current_batch = min(batch_size, args.limit - rows_read)

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
                (lang, last_id, current_batch),
            )
            batch = cur.fetchall()
        read_conn.rollback()

        if not batch:
            break

        updates = []
        for row in batch:
            word_id = row["id"]
            word    = row["word"]

            ipa = call_espeak(word, lang)
            if not ipa:
                rows_skipped += 1
                last_id = word_id
                rows_read += 1
                continue

            rhyme_part = extract_rhyme_part(ipa)
            pattern, syl_count = extract_stress_pattern(ipa)
            meter = classify_meter(pattern)

            updates.append({
                "id":             word_id,
                "ipa":            ipa,
                "rhyme_part":     rhyme_part,
                "stress_pattern": pattern,
                "syllable_count": syl_count if syl_count and syl_count > 0 else None,
                "meter":          meter,
            })
            last_id = word_id
            rows_read += 1

        if updates:
            with write_conn.cursor() as wcur:
                execute_batch(wcur, UPDATE_SQL, updates, page_size=len(updates))
            write_conn.commit()
            rows_updated += len(updates)

        pct = rows_read / total * 100 if total else 0
        print(
            f"  [{lang}] {rows_read:>7,} / {total:,} ({pct:.1f}%)  "
            f"updated={rows_updated:,}  skipped(no ipa)={rows_skipped:,}",
            end="\r",
            flush=True,
        )

    print(flush=True)  # newline after \r progress
    return rows_read, rows_updated, rows_skipped


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

target_langs = [l for l in args.langs if l in ESPEAK_USEFUL_LANGS]
if not target_langs:
    print(
        f"ERROR: None of the requested languages {args.langs} are in "
        f"ESPEAK_USEFUL_LANGS {sorted(ESPEAK_USEFUL_LANGS)}.",
        file=sys.stderr,
    )
    sys.exit(1)

print(f"Backfilling eSpeak IPA for languages: {target_langs}")
if args.dry_run:
    print("DRY RUN — counts only, no writes.")

grand_read = grand_updated = grand_skipped = 0
for lang in target_langs:
    r, u, s = process_language(lang)
    grand_read    += r
    grand_updated += u
    grand_skipped += s

print(f"\nDone. Total: read={grand_read:,}  updated={grand_updated:,}  skipped={grand_skipped:,}")

read_conn.close()
write_conn.close()

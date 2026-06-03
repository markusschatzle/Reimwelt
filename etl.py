#!/usr/bin/env python3
"""
etl.py — Kaikki/wiktextract JSONL → PostgreSQL ETL for the Reimmaschine rhyme dictionary.

Usage:
    python etl.py \
        --input data/raw-wiktextract-data.jsonl.gz \
        --db postgresql://user:pass@localhost/rhymes \
        --languages de en fr \
        --batch-size 1000

Dependencies (pip):
    psycopg2-binary  wordfreq  tqdm

System dependency (optional but recommended):
    espeak-ng  (apt install espeak-ng  |  brew install espeak-ng)
"""

from __future__ import annotations

import argparse
import gzip
import json
import logging
import sys
from collections import defaultdict
from typing import Any

import psycopg2
import psycopg2.extras
from tqdm import tqdm
from wordfreq import available_languages, word_frequency

from phonetics import (
    ESPEAK_AVAILABLE,
    ESPEAK_LANG_MAP,
    ESPEAK_USEFUL_LANGS,
    IPA_VOWELS_MULTICHAR,
    IPA_VOWELS_SINGLE,
    STRESS_FREE_LANGS,
    call_espeak,
    classify_meter,
    clean_ipa,
    extract_rhyme_part,
    extract_stress_pattern,
    get_authoritative_ipa,
    is_vowel_at,
)

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# Separate file handler for per-line errors so they don't drown stdout.
_error_fh = logging.FileHandler("etl_errors.log", encoding="utf-8")
_error_fh.setLevel(logging.ERROR)
_error_fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
log.addHandler(_error_fh)

# ---------------------------------------------------------------------------
# IPA utilities and eSpeak wrapper — imported from phonetics.py
# (all functions and constants below are defined there)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Frequency scoring
# ---------------------------------------------------------------------------

# Cache the set of wordfreq-supported languages for fast membership tests.
_WORDFREQ_LANGS: frozenset[str] = frozenset(available_languages())


def get_frequency(word: str, lang: str) -> float:
    """
    Return a wordfreq frequency score in the range [0.0, 1.0].

    Gracefully handles languages that wordfreq does not support by returning
    0.0.  Also suppresses any unexpected wordfreq exceptions so a single
    unusual word never crashes the run.
    """
    try:
        if lang in _WORDFREQ_LANGS:
            return word_frequency(word.lower(), lang, minimum=0.0)
    except Exception:
        pass
    return 0.0

# ---------------------------------------------------------------------------
# Per-entry field extraction (Stage 1 + Stage 2 called in order)
# ---------------------------------------------------------------------------

def extract_entry(raw: dict[str, Any]) -> dict[str, Any] | None:
    """
    Map a single kaikki entry dict to the flat column dict expected by the
    database upsert.

    Returns None if the entry has no 'word' field (nothing to store).

    All fields use .get() with safe defaults — a missing key never raises.
    The IPA pipeline is called in strict order:
        Stage 1: get_authoritative_ipa()   → ipa, ipa_source
        Stage 2: extract_rhyme_part()      → rhyme_part      (only if ipa is not None)
                 extract_stress_pattern()  → stress_pattern, syllable_count
                 classify_meter()          → meter
    """
    word: str | None = raw.get("word")
    if not word:
        return None

    lang: str = raw.get("lang_code", "")
    pos: str = raw.get("pos", "")

    # --- Raw IPA from kaikki sounds[] ---
    # Take the first sound entry that carries an 'ipa' key.
    ipa_raw: str | None = None
    audio_url: str | None = None
    for sound in raw.get("sounds", []):
        if ipa_raw is None and "ipa" in sound:
            ipa_raw = sound["ipa"]
        if audio_url is None:
            audio_url = sound.get("ogg_url") or sound.get("mp3_url")
        # Stop early if we have both fields.
        if ipa_raw is not None and audio_url is not None:
            break

    # -------------------------------------------------------------------------
    # IPA pipeline — Stage 1: get authoritative (stress-marked) IPA
    # -------------------------------------------------------------------------
    ipa, ipa_source = get_authoritative_ipa(ipa_raw, word, lang)

    # -------------------------------------------------------------------------
    # IPA pipeline — Stage 2: extract phonetic features from authoritative IPA
    # Only executed when Stage 1 produced a usable IPA string.
    # -------------------------------------------------------------------------
    rhyme_part: str | None = None
    stress_pattern: str | None = None
    syllable_count: int | None = None
    meter: str | None = None

    if ipa is not None:
        rhyme_part = extract_rhyme_part(ipa, lang)
        raw_pattern, syl_count = extract_stress_pattern(ipa)
        stress_pattern = raw_pattern
        syllable_count = syl_count if syl_count > 0 else None
        meter = classify_meter(stress_pattern)

    # --- Definitions: flatten all sense glosses into one array ---
    definitions: list[str] = []
    for sense in raw.get("senses", []):
        glosses = sense.get("glosses", [])
        if isinstance(glosses, list):
            definitions.extend(str(g) for g in glosses)

    # --- Synonyms / antonyms: keep full arrays ---
    synonyms: list[Any] = raw.get("synonyms", [])
    antonyms: list[Any] = raw.get("antonyms", [])

    # --- Inflections (forms) ---
    inflections: list[Any] = raw.get("forms", [])

    # --- Hyphenation: join list with middle dot ---
    hyphenation_list: list[str] = raw.get("hyphenation", [])
    hyphenation: str | None = (
        "\u00b7".join(hyphenation_list) if hyphenation_list else None
    )

    # --- Grammatical gender from first head_template args ---
    gender: str | None = None
    head_templates = raw.get("head_templates", [])
    if head_templates:
        gender = head_templates[0].get("args", {}).get("g")

    # --- Frequency score ---
    frequency_score: float = get_frequency(word, lang)

    # --- Boolean flags ---
    is_inflected_form: bool = bool(raw.get("form_of"))
    is_multiword: bool = " " in word
    is_abbreviation: bool = pos == "abbrev" or (word.isupper() and len(word) < 5)
    is_ghost_word: bool = frequency_score == 0.0

    return {
        "word":             word,
        "language":         lang,
        "ipa_raw":          ipa_raw,
        "ipa":              ipa,
        "ipa_source":       ipa_source,
        "rhyme_part":       rhyme_part,
        "stress_pattern":   stress_pattern,
        "meter":            meter,
        "syllable_count":   syllable_count,
        "pos":              pos,
        "gender":           gender,
        "definitions":      json.dumps(definitions, ensure_ascii=False),
        "etymology":        raw.get("etymology_text"),
        "synonyms":         json.dumps(synonyms, ensure_ascii=False),
        "antonyms":         json.dumps(antonyms, ensure_ascii=False),
        "inflections":      json.dumps(inflections, ensure_ascii=False),
        "hyphenation":      hyphenation,
        "audio_url":        audio_url,
        "frequency_score":  frequency_score,
        "is_inflected_form": is_inflected_form,
        "is_multiword":     is_multiword,
        "is_abbreviation":  is_abbreviation,
        "is_ghost_word":    is_ghost_word,
        "raw_kaikki":       json.dumps(raw, ensure_ascii=False),
    }

# ---------------------------------------------------------------------------
# Database schema
# ---------------------------------------------------------------------------

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS words (
    id                BIGSERIAL PRIMARY KEY,
    word              TEXT NOT NULL,
    language          TEXT NOT NULL,
    ipa_raw           TEXT,
    ipa               TEXT,
    ipa_source        TEXT,
    rhyme_part        TEXT,
    stress_pattern    TEXT,
    meter             TEXT,
    syllable_count    INTEGER,
    pos               TEXT,
    gender            TEXT,
    definitions       JSONB,
    etymology         TEXT,
    synonyms          JSONB,
    antonyms          JSONB,
    inflections       JSONB,
    hyphenation       TEXT,
    audio_url         TEXT,
    frequency_score   FLOAT DEFAULT 0.0,
    is_inflected_form BOOLEAN DEFAULT FALSE,
    is_multiword      BOOLEAN DEFAULT FALSE,
    is_abbreviation   BOOLEAN DEFAULT FALSE,
    is_ghost_word     BOOLEAN DEFAULT FALSE,
    raw_kaikki        JSONB,
    UNIQUE (word, language, pos)
);
"""

_CREATE_INDEXES_SQL = """
CREATE INDEX IF NOT EXISTS idx_rhyme_lang  ON words(language, rhyme_part);
CREATE INDEX IF NOT EXISTS idx_rhyme_cross ON words(rhyme_part);
CREATE INDEX IF NOT EXISTS idx_meter       ON words(language, meter);
CREATE INDEX IF NOT EXISTS idx_stress      ON words(language, stress_pattern);
CREATE INDEX IF NOT EXISTS idx_syllables   ON words(language, syllable_count);
CREATE INDEX IF NOT EXISTS idx_frequency   ON words(language, frequency_score DESC);
CREATE INDEX IF NOT EXISTS idx_word_lang   ON words(word, language);
"""


def create_schema(conn: "psycopg2.connection") -> None:
    """Create the words table and all indexes if they do not yet exist."""
    with conn.cursor() as cur:
        cur.execute(_CREATE_TABLE_SQL)
        for stmt in _CREATE_INDEXES_SQL.strip().split("\n"):
            stmt = stmt.strip()
            if stmt:
                cur.execute(stmt)
    conn.commit()
    log.info("Schema ready.")

# ---------------------------------------------------------------------------
# Upsert SQL and batch insert
# ---------------------------------------------------------------------------

# Column order used in both the INSERT and the VALUES tuple construction.
# Keeping it as a tuple makes it easy to keep INSERT and tuple() in sync.
_COLUMNS = (
    "word", "language", "ipa_raw", "ipa", "ipa_source",
    "rhyme_part", "stress_pattern", "meter", "syllable_count",
    "pos", "gender", "definitions", "etymology",
    "synonyms", "antonyms", "inflections", "hyphenation", "audio_url",
    "frequency_score", "is_inflected_form", "is_multiword",
    "is_abbreviation", "is_ghost_word", "raw_kaikki",
)

# The DO UPDATE clause refreshes every non-key column on conflict so the
# script is safe to re-run after a crash or after downloading a new dump.
_UPDATE_SET = ", ".join(
    f"{col} = EXCLUDED.{col}"
    for col in _COLUMNS
    if col not in ("word", "language", "pos")
)

UPSERT_SQL = f"""
INSERT INTO words ({", ".join(_COLUMNS)})
VALUES %s
ON CONFLICT (word, language, pos) DO UPDATE SET
    {_UPDATE_SET}
"""


def _entry_to_tuple(entry: dict[str, Any]) -> tuple:
    """Convert an extracted entry dict to a values tuple matching _COLUMNS order."""
    return tuple(entry[col] for col in _COLUMNS)


def insert_batch(cur: "psycopg2.cursor", batch: list[dict[str, Any]]) -> int:
    """
    Upsert a list of entry dicts into the words table using execute_values
    for maximum throughput.  Returns the number of rows actually sent to the DB.

    Deduplication: ON CONFLICT only resolves conflicts with *existing* rows.
    If two entries in the same batch share the same (word, language, pos) key,
    PostgreSQL raises a duplicate-key violation that aborts the transaction.
    We deduplicate within the batch first, keeping the last occurrence.
    """
    # Deduplicate within the batch by the UNIQUE conflict key.
    seen: dict[tuple, dict[str, Any]] = {}
    for e in batch:
        key = (e["word"], e["language"], e["pos"] or "")
        seen[key] = e  # last entry for this key wins (mirrors ON CONFLICT DO UPDATE)
    values = [_entry_to_tuple(e) for e in seen.values()]
    psycopg2.extras.execute_values(cur, UPSERT_SQL, values, page_size=len(values))
    return len(values)

# ---------------------------------------------------------------------------
# Per-language stats dataclass (plain dict for simplicity)
# ---------------------------------------------------------------------------

def _new_stats() -> dict[str, int]:
    return {
        "processed":        0,
        "inserted":         0,
        "skipped_no_word":  0,
        "espeak_fallbacks": 0,
        "espeak_failed":    0,
        "no_ipa":           0,
    }


def _fmt_stats(lang: str, s: dict[str, int]) -> str:
    return (
        f"[{lang}] processed={s['processed']} inserted={s['inserted']} "
        f"skipped_no_word={s['skipped_no_word']} "
        f"espeak_fallbacks={s['espeak_fallbacks']} "
        f"espeak_failed={s['espeak_failed']} "
        f"no_ipa={s['no_ipa']}"
    )

# ---------------------------------------------------------------------------
# Streaming ETL loop
# ---------------------------------------------------------------------------

def process_file(
    gz_path: str,
    conn: "psycopg2.connection",
    languages_filter: set[str] | None,
    batch_size: int,
) -> dict[str, dict[str, int]]:
    """
    Stream *gz_path* line by line, extract entries, and upsert into the DB.

    Parameters
    ----------
    gz_path:
        Path to the gzip-compressed JSONL file.
    conn:
        An open psycopg2 connection (autocommit OFF).
    languages_filter:
        If not None, only entries whose lang_code is in this set are processed.
        Pass None to process all languages.
    batch_size:
        How many extracted entries to accumulate before flushing to the DB.

    Returns
    -------
    A dict mapping lang_code → stats dict (see _new_stats()).
    """
    # lang_code → {processed, inserted, ...}
    stats: dict[str, dict[str, int]] = defaultdict(_new_stats)
    batch: list[dict[str, Any]] = []
    total_lines = 0

    def flush_batch() -> None:
        """Upsert the current batch and commit.

        Clears the batch immediately before hitting the DB so that a failed
        flush never retries the same rows (they will be picked up on the next
        idempotent re-run).  Rolls back on any DB error so the connection is
        always left in a clean state for the next batch.
        """
        nonlocal batch
        if not batch:
            return
        current_batch = batch
        batch = []  # clear before DB work — failed rows won't be retried this run
        try:
            with conn.cursor() as cur:
                insert_batch(cur, current_batch)
            conn.commit()
            for e in current_batch:
                stats[e["language"]]["inserted"] += 1
        except Exception:
            conn.rollback()  # reset aborted transaction so subsequent batches can proceed
            raise

    log.info("Opening %s …", gz_path)

    with gzip.open(gz_path, "rt", encoding="utf-8", errors="replace") as fh:
        for raw_line in tqdm(fh, desc="lines", unit=" lines"):
            total_lines += 1

            # ----------------------------------------------------------------
            # Progress report every 10 000 lines (across all languages)
            # ----------------------------------------------------------------
            if total_lines % 10_000 == 0:
                for lang, s in sorted(stats.items()):
                    if s["processed"] > 0:
                        log.info(_fmt_stats(lang, s))

            # ----------------------------------------------------------------
            # Skip empty / whitespace-only lines
            # ----------------------------------------------------------------
            raw_line = raw_line.strip()
            if not raw_line:
                continue

            # ----------------------------------------------------------------
            # Per-line error isolation
            # ----------------------------------------------------------------
            try:
                raw: dict[str, Any] = json.loads(raw_line)

                lang_code: str = raw.get("lang_code", "")

                # Language filter (if --languages was specified)
                if languages_filter and lang_code not in languages_filter:
                    continue

                # Accumulate stats for this language from now on.
                s = stats[lang_code]
                s["processed"] += 1

                # Extract all fields from the raw entry dict.
                entry = extract_entry(raw)

                if entry is None:
                    s["skipped_no_word"] += 1
                    continue

                # Tally IPA pipeline outcomes for the progress report.
                if entry["ipa_source"] == "espeak":
                    s["espeak_fallbacks"] += 1
                elif entry["ipa_source"] == "none":
                    if entry["ipa_raw"] is not None:
                        # kaikki had IPA but eSpeak also couldn't help
                        s["espeak_failed"] += 1
                    else:
                        s["no_ipa"] += 1

                batch.append(entry)

                if len(batch) >= batch_size:
                    flush_batch()

            except Exception as exc:  # noqa: BLE001
                log.error(
                    "Line %d failed: %s | raw=%s",
                    total_lines,
                    exc,
                    raw_line[:500],
                )

    # Flush the final (possibly partial) batch after the loop ends.
    flush_batch()

    return dict(stats)

# ---------------------------------------------------------------------------
# CLI argument parsing
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="ETL kaikki/wiktextract JSONL dump into a PostgreSQL rhyme database."
    )
    parser.add_argument(
        "--input",
        default="data/raw-wiktextract-data.jsonl.gz",
        metavar="PATH",
        help="Path to the gzip-compressed JSONL dump (default: data/raw-wiktextract-data.jsonl.gz)",
    )
    parser.add_argument(
        "--db",
        required=True,
        metavar="DSN",
        help="PostgreSQL connection string, e.g. postgresql://user:pass@localhost/rhymes",
    )
    parser.add_argument(
        "--languages",
        nargs="*",
        metavar="LANG",
        default=None,
        help=(
            "Space-separated ISO 639-1/3 lang_codes to process. "
            "If omitted, all languages are processed."
        ),
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        metavar="N",
        help="Number of rows to accumulate before each DB upsert (default: 1000)",
    )
    return parser.parse_args()

# ---------------------------------------------------------------------------
# Main entrypoint
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()

    languages_filter: set[str] | None = (
        set(args.languages) if args.languages else None
    )
    if languages_filter:
        log.info("Filtering to languages: %s", sorted(languages_filter))
    else:
        log.info("Processing all languages.")

    log.info("Connecting to database …")
    try:
        conn = psycopg2.connect(args.db)
    except Exception as exc:
        log.error("Cannot connect to database: %s", exc)
        sys.exit(1)

    try:
        create_schema(conn)

        all_stats = process_file(
            gz_path=args.input,
            conn=conn,
            languages_filter=languages_filter,
            batch_size=args.batch_size,
        )
    finally:
        conn.close()

    # -------------------------------------------------------------------------
    # Final per-language summary
    # -------------------------------------------------------------------------
    print("\n" + "=" * 72)
    print("ETL COMPLETE — per-language summary")
    print("=" * 72)
    total_inserted = 0
    for lang, s in sorted(all_stats.items()):
        print(_fmt_stats(lang, s))
        total_inserted += s["inserted"]
    print("-" * 72)
    print(f"Total rows inserted/updated: {total_inserted}")
    print("=" * 72)

    # Report eSpeak cache efficiency if it was used.
    if ESPEAK_AVAILABLE:
        ci = call_espeak.cache_info()
        log.info(
            "eSpeak LRU cache: hits=%d misses=%d maxsize=%d",
            ci.hits,
            ci.misses,
            ci.maxsize,
        )


if __name__ == "__main__":
    main()

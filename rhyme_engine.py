"""
rhyme_engine.py — Core rhyme-search backend for the Reimmaschine app.

Provides:
  - ThreadedConnectionPool-backed DB access via get_db() context manager
  - PHONEME_FEATURES module-level constant (IPA → articulatory feature vector)
  - phoneme_distance() / rhyme_part_similarity() cross-language purity scoring
  - find_rhymes()       — main search entry point
  - RhymeResult         — result dataclass
  - get_word_data()     — word inspection
  - update_word_field() — single-field DB update with whitelist guard
  - reprocess_ipa()     — re-run full IPA pipeline for a stored word
  - find_data_issues()  — data-quality audit report

All DB queries use parameterised queries exclusively; no SQL string
formatting is performed anywhere in this module.

Configuration (environment variables):
  DATABASE_URL        — required psycopg2 connection string
  ESPEAK_TIMEOUT      — default 5 (seconds)
  ESPEAK_CACHE_SIZE   — default 50000
  DEFAULT_LIMIT       — default 50
  DEFAULT_SORT_MODE   — default 'balanced'
"""

from __future__ import annotations

import contextlib
import json
import logging
import math
import os
import re
from dataclasses import dataclass, field
from typing import Any, Generator

import psycopg2
import psycopg2.extras
import psycopg2.pool

from phonetics import (
    ESPEAK_USEFUL_LANGS,
    call_espeak,
    classify_meter,
    clean_ipa,
    extract_rhyme_part,
    extract_stress_pattern,
    get_authoritative_ipa,
    is_vowel_at,
    normalize_rhyme_ipa,
)

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
DEFAULT_LIMIT: int = int(os.environ.get("DEFAULT_LIMIT", "50"))
DEFAULT_SORT_MODE: str = os.environ.get("DEFAULT_SORT_MODE", "balanced")

# ---------------------------------------------------------------------------
# Connection pool
# ---------------------------------------------------------------------------

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    """
    Lazily initialise and return the module-level ThreadedConnectionPool.

    The pool is created on the first call using DATABASE_URL from the
    environment.  Raises RuntimeError if DATABASE_URL is not set.

    Returns
    -------
    The module-level ThreadedConnectionPool instance.
    """
    global _pool
    if _pool is None:
        if not DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL environment variable is not set.  "
                "Export it before importing rhyme_engine."
            )
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=DATABASE_URL,
        )
        log.debug("Connection pool created (min=1, max=10).")
    return _pool


@contextlib.contextmanager
def get_db() -> Generator[psycopg2.extensions.connection, None, None]:
    """
    Context manager that checks out a connection from the pool, yields it,
    and returns it cleanly on exit (rolling back any uncommitted transaction
    so the connection is always in a clean state when returned).

    Usage::

        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
    """
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)

# ---------------------------------------------------------------------------
# Phoneme feature vectors
#
# Vowels  — 5 features: [height, backness, roundedness, length, nasality]
#   height:      0.0 = open (a)  →  1.0 = close (i/u)
#   backness:    0.0 = front     →  0.5 = central  →  1.0 = back
#   roundedness: 0.0 = unrounded →  1.0 = rounded
#   length:      0.0 = short     →  1.0 = long
#   nasality:    0.0 = oral      →  1.0 = nasal
#
# Consonants — 6 features: [place, manner, voiced, nasal, lateral, continuant]
#   place:       0.0 = bilabial  →  1.0 = glottal   (see scale below)
#   manner:      0.0 = stop      →  1.0 = approximant
#   voiced:      0.0 = voiceless →  1.0 = voiced
#   nasal:       0.0 = non-nasal →  1.0 = nasal
#   lateral:     0.0 = non-lat.  →  1.0 = lateral
#   continuant:  0.0 = non-cont. →  1.0 = continuant
#
# Place scale (approximate):
#   bilabial=0.00  labiodental=0.10  dental=0.20  alveolar=0.30
#   post-alveolar=0.40  palatal=0.50  velar=0.70  uvular=0.85  glottal=1.00
#
# Manner scale:
#   stop=0.00  affricate=0.25  fricative=0.50  nasal=0.60
#   trill=0.70  tap=0.75  lateral=0.85  approximant=1.00
# ---------------------------------------------------------------------------

PHONEME_FEATURES: dict[str, list[float]] = {
    # ------------------------------------------------------------------
    # VOWELS  [height, backness, roundedness, length, nasality, diphthong]
    #   diphthong: 0.0 = monophthong, 1.0 = diphthong
    # ------------------------------------------------------------------

    # --- Open / low vowels ---
    "a":  [0.00, 0.30, 0.0, 0.0, 0.0, 0.0],
    "aː": [0.00, 0.30, 0.0, 1.0, 0.0, 0.0],
    "ɑ":  [0.00, 1.00, 0.0, 0.0, 0.0, 0.0],
    "ɑː": [0.00, 1.00, 0.0, 1.0, 0.0, 0.0],
    "ɒ":  [0.00, 1.00, 1.0, 0.0, 0.0, 0.0],

    # --- Near-open ---
    "æ":  [0.20, 0.00, 0.0, 0.0, 0.0, 0.0],
    # ɐ (near-open central) is the German/Dutch vocalized-r and serves as
    # an unstressed central vowel essentially equivalent to ə in cross-language
    # contexts.  Height moved from 0.15 → 0.40 so that distance(ɐ, ə) ≈ 0.04
    # (was 0.14), reflecting the fact that the two symbols are freely
    # interchangeable between transcription traditions.
    "ɐ":  [0.40, 0.50, 0.0, 0.0, 0.0, 0.0],

    # --- Open-mid ---
    "ɛ":  [0.40, 0.00, 0.0, 0.0, 0.0, 0.0],
    "ɛː": [0.40, 0.00, 0.0, 1.0, 0.0, 0.0],
    "œ":  [0.40, 0.00, 1.0, 0.0, 0.0, 0.0],
    "ɜ":  [0.40, 0.50, 0.0, 0.0, 0.0, 0.0],
    "ɜː": [0.40, 0.50, 0.0, 1.0, 0.0, 0.0],
    "ɔ":  [0.40, 1.00, 1.0, 0.0, 0.0, 0.0],
    "ɔː": [0.40, 1.00, 1.0, 1.0, 0.0, 0.0],
    "ʌ":  [0.40, 0.70, 0.0, 0.0, 0.0, 0.0],

    # Rhotic schwas — American English 'er' (unstressed) / 'ɜr' (stressed).
    # The rhotic quality is not captured in the current 6-feature scheme;
    # we approximate them as plain central vowels so cross-dialect scoring
    # (EN 'fire' /faɪɚ/ vs DE 'Eier') works naturally.
    "ɚ":  [0.50, 0.50, 0.0, 0.0, 0.0, 0.0],  # unstressed rhotic schwa (≈ ə)
    "ɝ":  [0.40, 0.50, 0.0, 0.0, 0.0, 0.0],  # stressed rhotic schwa  (≈ ɜ)

    # --- Mid ---
    "e":  [0.70, 0.00, 0.0, 0.0, 0.0, 0.0],
    "eː": [0.70, 0.00, 0.0, 1.0, 0.0, 0.0],
    "ø":  [0.70, 0.00, 1.0, 0.0, 0.0, 0.0],
    "øː": [0.70, 0.00, 1.0, 1.0, 0.0, 0.0],
    "o":  [0.70, 1.00, 1.0, 0.0, 0.0, 0.0],
    "oː": [0.70, 1.00, 1.0, 1.0, 0.0, 0.0],
    "ə":  [0.50, 0.50, 0.0, 0.0, 0.0, 0.0],

    # --- Near-close ---
    "ɪ":  [0.85, 0.10, 0.0, 0.0, 0.0, 0.0],
    "ʊ":  [0.85, 0.90, 1.0, 0.0, 0.0, 0.0],

    # --- Close ---
    "i":  [1.00, 0.00, 0.0, 0.0, 0.0, 0.0],
    "iː": [1.00, 0.00, 0.0, 1.0, 0.0, 0.0],
    "y":  [1.00, 0.00, 1.0, 0.0, 0.0, 0.0],
    "yː": [1.00, 0.00, 1.0, 1.0, 0.0, 0.0],
    "u":  [1.00, 1.00, 1.0, 0.0, 0.0, 0.0],
    "uː": [1.00, 1.00, 1.0, 1.0, 0.0, 0.0],

    # ------------------------------------------------------------------
    # DIPHTHONGS  [height, backness, roundedness, length, nasality, diphthong]
    # Average of start/end vowel features; diphthong=1.0 distinguishes them
    # from any monophthong regardless of vowel-space proximity.
    # ------------------------------------------------------------------
    "aɪ": [0.50, 0.15, 0.0, 0.0, 0.0, 1.0],  # a → ɪ
    "aʊ": [0.50, 0.65, 0.5, 0.0, 0.0, 1.0],  # a → ʊ
    "ɔʏ": [0.62, 0.55, 1.0, 0.0, 0.0, 1.0],  # ɔ → ʏ (near-close near-front rounded)
    "eɪ": [0.78, 0.05, 0.0, 0.0, 0.0, 1.0],  # e → ɪ  (avg height: (0.70+0.85)/2)
    "oʊ": [0.78, 0.95, 1.0, 0.0, 0.0, 1.0],  # o → ʊ  (avg height: (0.70+0.85)/2)
    "ɔɪ": [0.63, 0.55, 0.5, 0.0, 0.0, 1.0],  # ɔ → ɪ  (avg height: (0.40+0.85)/2)

    # ------------------------------------------------------------------
    # CONSONANTS  [place, manner, voiced, nasal, lateral, continuant]
    # ------------------------------------------------------------------

    # --- Bilabial stops ---
    "p":  [0.00, 0.00, 0.0, 0.0, 0.0, 0.0],
    "b":  [0.00, 0.00, 1.0, 0.0, 0.0, 0.0],

    # --- Alveolar stops ---
    "t":  [0.30, 0.00, 0.0, 0.0, 0.0, 0.0],
    "d":  [0.30, 0.00, 1.0, 0.0, 0.0, 0.0],

    # --- Velar stops ---
    "k":  [0.70, 0.00, 0.0, 0.0, 0.0, 0.0],
    "g":  [0.70, 0.00, 1.0, 0.0, 0.0, 0.0],

    # --- Glottal stop ---
    "ʔ":  [1.00, 0.00, 0.0, 0.0, 0.0, 0.0],

    # --- Labiodental fricatives ---
    "f":  [0.10, 0.50, 0.0, 0.0, 0.0, 1.0],
    "v":  [0.10, 0.50, 1.0, 0.0, 0.0, 1.0],

    # --- Alveolar fricatives ---
    "s":  [0.30, 0.50, 0.0, 0.0, 0.0, 1.0],
    "z":  [0.30, 0.50, 1.0, 0.0, 0.0, 1.0],

    # --- Post-alveolar fricatives ---
    "ʃ":  [0.40, 0.50, 0.0, 0.0, 0.0, 1.0],
    "ʒ":  [0.40, 0.50, 1.0, 0.0, 0.0, 1.0],

    # --- Velar/palatal fricatives ---
    "x":  [0.70, 0.50, 0.0, 0.0, 0.0, 1.0],
    "ç":  [0.50, 0.50, 0.0, 0.0, 0.0, 1.0],
    "ɣ":  [0.70, 0.50, 1.0, 0.0, 0.0, 1.0],

    # --- Glottal fricative ---
    "h":  [1.00, 0.50, 0.0, 0.0, 0.0, 1.0],

    # --- Nasals ---
    "m":  [0.00, 0.60, 1.0, 1.0, 0.0, 0.0],
    "n":  [0.30, 0.60, 1.0, 1.0, 0.0, 0.0],
    "ŋ":  [0.70, 0.60, 1.0, 1.0, 0.0, 0.0],
    "ɲ":  [0.50, 0.60, 1.0, 1.0, 0.0, 0.0],

    # --- Lateral ---
    "l":  [0.30, 0.85, 1.0, 0.0, 1.0, 1.0],

    # --- Rhotics ---
    "r":  [0.30, 0.70, 1.0, 0.0, 0.0, 1.0],   # alveolar trill
    "ʁ":  [0.85, 0.50, 1.0, 0.0, 0.0, 1.0],   # uvular fricative/trill (French/German)
    "ɾ":  [0.30, 0.75, 1.0, 0.0, 0.0, 0.5],   # alveolar tap
    "ɹ":  [0.30, 1.00, 1.0, 0.0, 0.0, 1.0],   # alveolar approximant (English)

    # --- Palatal / labiovelar approximants ---
    "j":  [0.50, 1.00, 1.0, 0.0, 0.0, 1.0],
    "w":  [0.35, 1.00, 1.0, 0.0, 0.0, 1.0],

    # --- Affricates ---
    "ts": [0.30, 0.25, 0.0, 0.0, 0.0, 0.0],
    "dz": [0.30, 0.25, 1.0, 0.0, 0.0, 0.0],
    "tʃ": [0.40, 0.25, 0.0, 0.0, 0.0, 0.0],
    "dʒ": [0.40, 0.25, 1.0, 0.0, 0.0, 0.0],
    "pf": [0.05, 0.25, 0.0, 0.0, 0.0, 0.0],
}

# Pre-compute the maximum possible Euclidean distance within each vector
# shape so we can normalise to [0, 1] without a sqrt(n_dims) magic number.
# Both vowels and consonants now use 6-dimensional feature vectors; vowels
# have a 6th 'diphthong' feature (0=monophthong, 1=diphthong) which gives
# a hard ~0.41 distance floor between any diphthong and any monophthong.
_MAX_VOWEL_DIST: float = math.sqrt(6.0)        # all features span 0–1; √6 dims
_MAX_CONSONANT_DIST: float = math.sqrt(6.0)   # √6 dims

# Explicit vowel set — used for type-checking in phoneme_distance() since
# both vowels and consonants now share a 6-dimensional feature space.
_VOWEL_PHONEMES: frozenset[str] = frozenset([
    "a", "aː", "ɑ", "ɑː", "ɒ", "æ", "ɐ",
    "ɛ", "ɛː", "œ", "ɜ", "ɜː", "ɔ", "ɔː", "ʌ",
    "e", "eː", "ø", "øː", "o", "oː", "ə",
    "ɚ", "ɝ",
    "ɪ", "ʊ",
    "i", "iː", "y", "yː", "u", "uː",
    "aɪ", "aʊ", "ɔʏ", "eɪ", "oʊ", "ɔɪ",
])
_CONSONANT_PHONEMES: frozenset[str] = frozenset(
    p for p in PHONEME_FEATURES if p not in _VOWEL_PHONEMES
)

# Diphthongs — a strict subset of _VOWEL_PHONEMES.  A diphthong nucleus and a
# monophthong nucleus are treated as categorically different: they never rhyme.
_DIPHTHONG_PHONEMES: frozenset[str] = frozenset([
    "aɪ", "aʊ", "ɔʏ", "eɪ", "oʊ", "ɔɪ",
])

# ---------------------------------------------------------------------------
# IPA tokeniser (shared across all similarity functions)
# ---------------------------------------------------------------------------

# All known multi-character IPA symbols, sorted longest-first for greedy match.
_MULTICHAR_TOKENS: list[str] = sorted(
    [p for p in PHONEME_FEATURES if len(p) > 1],
    key=len,
    reverse=True,
)


def _tokenise_ipa(ipa: str) -> list[str]:
    """
    Split an IPA string into a list of phoneme tokens.

    Longest-match-first greedy scan so that diphthongs (aɪ), long vowels
    (aː), and affricates (tʃ) are captured as single tokens before their
    component symbols are tried.

    Parameters
    ----------
    ipa:
        Cleaned IPA string (no delimiters, no leading/trailing spaces).

    Returns
    -------
    List of phoneme token strings.  Unrecognised characters are kept as
    single-character tokens.
    """
    tokens: list[str] = []
    i = 0
    # Strip stress / length diacritics that are not part of phoneme identity.
    clean = clean_ipa(ipa).replace("ˈ", "").replace("ˌ", "").replace("ː", "")
    # Re-add length as part of the token by working from the original.
    # Actually: work from the cleaned-of-only-stress-markers string
    # so that "ˈaʁmuːt" becomes "aʁmuːt" and "uː" is matched as one token.
    ipa_stripped = clean_ipa(ipa).replace("ˈ", "").replace("ˌ", "")
    # Strip non-syllabic diacritic ̯ (U+032F): it marks a vowel as a glide
    # within a diphthong but is redundant for phoneme identity — aɪ̯ and aɪ
    # are the same token.  Removing it here handles any legacy DB rows that
    # were stored before the normalisation fix landed in _normalize_rhyme_ipa.
    ipa_stripped = ipa_stripped.replace("\u032F", "")
    while i < len(ipa_stripped):
        matched = False
        for tok in _MULTICHAR_TOKENS:
            end = i + len(tok)
            if ipa_stripped[i:end] == tok:
                tokens.append(tok)
                i = end
                matched = True
                break
        if not matched:
            ch = ipa_stripped[i]
            # Skip pure diacritics that don't belong to any phoneme token.
            if ch not in ("ˈ", "ˌ", "."):
                tokens.append(ch)
            i += 1
    return tokens

# ---------------------------------------------------------------------------
# Phoneme distance
# ---------------------------------------------------------------------------

def phoneme_distance(p1: str, p2: str) -> float:
    """
    Compute the articulatory distance between two IPA phoneme strings.

    Returns a float in [0.0, 1.0]:
      - 0.0  identical phonemes
      - 1.0  maximally different (or one is a vowel and the other a consonant)

    Rules:
      1. Identical strings → 0.0.
      2. Either phoneme unknown → 0.5 (neutral fallback).
      3. One vowel, one consonant (different feature vector lengths) → 1.0.
      4. Both same type → Euclidean distance normalised to [0, 1].

    Parameters
    ----------
    p1, p2:
        IPA phoneme strings (single segment, e.g. 'a', 'aː', 'tʃ').

    Returns
    -------
    Distance float in [0.0, 1.0].
    """
    if p1 == p2:
        return 0.0

    v1 = PHONEME_FEATURES.get(p1)
    v2 = PHONEME_FEATURES.get(p2)

    if v1 is None or v2 is None:
        return 0.5

    v1_is_vowel = p1 in _VOWEL_PHONEMES
    v2_is_vowel = p2 in _VOWEL_PHONEMES
    if v1_is_vowel != v2_is_vowel:
        # One is a vowel and the other a consonant.
        return 1.0

    max_dist = _MAX_VOWEL_DIST if v1_is_vowel else _MAX_CONSONANT_DIST
    euclidean = math.sqrt(sum((a - b) ** 2 for a, b in zip(v1, v2)))
    return min(euclidean / max_dist, 1.0)

# ---------------------------------------------------------------------------
# Rhyme part similarity
# ---------------------------------------------------------------------------

def rhyme_part_similarity(rp1: str, rp2: str) -> float:
    """
    Compare two IPA rhyme parts and return a similarity score in [0.0, 1.0].

    Algorithm:
        1. Tokenise both rhyme parts into individual IPA segments using
           longest-match-first greedy scanning (handles diphthongs, long
           vowels, affricates).
        2. Align from the END (rhymes are end-anchored).
        3. Score each aligned pair with phoneme_distance(); similarity for
           that pair = 1.0 - distance.
        4. Weight by position from end: weight = 1 / (pos_from_end + 1).
           Position 0 is the final token (highest weight).
        5. Apply length penalty: min(len1, len2) / max(len1, len2).
        6. Return weighted_average_similarity * length_penalty.

    Parameters
    ----------
    rp1, rp2:
        IPA rhyme part strings (output of extract_rhyme_part()).

    Returns
    -------
    Similarity float in [0.0, 1.0].  Returns 0.0 if either string has no
    parseable tokens.
    """
    tokens1 = _tokenise_ipa(rp1)
    tokens2 = _tokenise_ipa(rp2)

    if not tokens1 or not tokens2:
        return 0.0

    # Nucleus diphthong guard — the rhyme nucleus is the first vowel token.
    # A diphthong nucleus and a monophthong nucleus are categorically different
    # vowel types and cannot rhyme (e.g. ɪdz / fridge vs eɪdz / age).
    def _first_vowel(toks: list[str]) -> str | None:
        for t in toks:
            if t in _VOWEL_PHONEMES:
                return t
        return None

    n1 = _first_vowel(tokens1)
    n2 = _first_vowel(tokens2)
    if n1 is not None and n2 is not None:
        if (n1 in _DIPHTHONG_PHONEMES) != (n2 in _DIPHTHONG_PHONEMES):
            return 0.0

    # Length penalty
    len1, len2 = len(tokens1), len(tokens2)
    length_penalty = min(len1, len2) / max(len1, len2)

    # Align from the end
    pairs_from_end = min(len1, len2)
    total_weight = 0.0
    weighted_sim = 0.0

    for pos in range(pairs_from_end):
        # pos 0 = last token (most important for rhyme)
        t1 = tokens1[len1 - 1 - pos]
        t2 = tokens2[len2 - 1 - pos]
        weight = 1.0 / (pos + 1)
        sim = 1.0 - phoneme_distance(t1, t2)
        weighted_sim += weight * sim
        total_weight += weight

    if total_weight == 0.0:
        return 0.0

    return (weighted_sim / total_weight) * length_penalty

# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class RhymeResult:
    """A single rhyme candidate returned by find_rhymes()."""

    word: str
    language: str
    ipa: str
    rhyme_part: str
    purity_score: float
    frequency_score: float
    combined_score: float
    syllable_count: int
    meter: str | None
    stress_pattern: str | None
    pos: str
    definitions: list[str]
    audio_url: str | None

# ---------------------------------------------------------------------------
# Score helpers
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Word-form quality helpers
# ---------------------------------------------------------------------------

# Compiled regexes for detecting non-standard word forms.
_RE_WORD_SPECIAL   = re.compile(r"[^\w'\-]", re.UNICODE)  # ♯, ♭, &, digits-as-symbols, etc.
_RE_WORD_HYPHEN    = re.compile(r"-")                       # pre-disease, co-op, etc.
_RE_WORD_INTCAPS   = re.compile(r"[a-z][A-Z]|[A-Z]{2,}")   # GoEs, iPhone, TO, DO, etc.
_RE_WORD_HAS_DIGIT = re.compile(r"\d")                      # 2, 42, 4th, etc. — filtered out entirely

# Detects ASCII umlaut substitutions in German: ue/ae/oe preceded by a consonant
# (or at word-start) signal "fuer"→"für", "haette"→"hätte", "koennen"→"können".
# Lookbehind excludes vowels and "q" so "neue" (eu+e boundary), "Aue" (au+e),
# "treue", "quer" etc. are not flagged as non-standard.
_RE_DE_UMLAUT_SUBST = re.compile(r"(?<![aeiouäöüqAEIOUÄÖÜQ])(?:ue|ae|oe)", re.UNICODE)


def _german_word_form_penalty(word: str) -> float:
    """Return a multiplier in (0, 1] penalising German ASCII umlaut substitutions."""
    w = word.lower()
    if any(c in w for c in "äöüß"):
        return 1.0  # already uses proper German characters
    if _RE_DE_UMLAUT_SUBST.search(w):
        return 0.05
    return 1.0


def _word_form_penalty(word: str) -> float:
    """
    Return a score multiplier in (0, 1] that penalises non-standard English
    word forms.  A multiplier of 1.0 means no penalty.

    Applied *only* to English candidates so other languages are unaffected.
    Checks are ordered most-severe-first; returns on the first match (no stacking).
    """
    if _RE_WORD_SPECIAL.search(word):  # e.g. D♯s
        return 0.2
    if word.startswith("'"):           # e.g. 'tis, 'twas
        return 0.3
    if _RE_WORD_HYPHEN.search(word):   # e.g. pre-disease
        return 0.006
    if _RE_WORD_INTCAPS.search(word):  # e.g. GoEs
        return 0.3
    return 1.0


def _freq_normalized(freq: float) -> float:
    """Normalise a raw frequency score to [0, 1] via log10 scale."""
    return (math.log10(freq + 1e-9) + 9) / 9


def _combined_score(purity: float, freq: float, sort_mode: str) -> float:
    """
    Compute a combined ranking score from purity and frequency.

    Parameters
    ----------
    purity:
        Rhyme purity score from rhyme_part_similarity(), in [0, 1].
    freq:
        Raw frequency_score from the DB.
    sort_mode:
        One of 'purity', 'usefulness', or 'balanced'.

    Returns
    -------
    Combined score float in approximately [0, 1].
    """
    fn = _freq_normalized(freq)
    scores = {
        "purity":     purity,
        "usefulness": fn,
        "balanced":   purity * 0.5 + fn * 0.5,
    }
    return scores.get(sort_mode, scores["balanced"])

# ---------------------------------------------------------------------------
# DB query helpers
# ---------------------------------------------------------------------------

def _minimal_suffix(rhyme_part: str) -> str:
    """
    Return the nucleus+coda of *rhyme_part* anchored at the last
    non-weak vowel.

    Weak vowels (schwa "ə", near-open central "ɐ") are unstressed and too
    permissive as a rhyme anchor — e.g. anchoring on the trailing "ə" in
    "iːɡə" (liege) would match every German word ending in schwa.  We
    therefore anchor at the last vowel that is not weak; falling back to the
    last vowel of any kind only when the rhyme part is entirely weak-vowel.

    Examples:
        'aʁmuːt' → 'uːt'   (last vowel 'uː', non-weak)
        'ɛst'    → 'ɛst'   (last vowel 'ɛ', non-weak)
        'iːɡə'   → 'iːɡə'  (last vowel 'ə' is weak → use prev 'iː')
        'ɪŋən'   → 'ɪŋən'  (last vowel 'ə' is weak → use prev 'ɪ')
    """
    _WEAK_VOWELS: frozenset[str] = frozenset({"ə", "ɐ", "ɜ"})

    last_vowel_start: int | None = None
    last_strong_vowel_start: int | None = None
    i = 0
    while i < len(rhyme_part):
        is_v, length = is_vowel_at(rhyme_part, i)
        if is_v:
            phoneme = rhyme_part[i : i + length]
            last_vowel_start = i
            if phoneme not in _WEAK_VOWELS:
                last_strong_vowel_start = i
            i += length
        else:
            i += 1
    anchor = last_strong_vowel_start if last_strong_vowel_start is not None else last_vowel_start
    if anchor is not None:
        return rhyme_part[anchor:]
    return rhyme_part  # fallback: use the whole rhyme_part


_CANDIDATE_SQL = """
SELECT
    word, language, ipa, rhyme_part, frequency_score,
    syllable_count, meter, stress_pattern, pos,
    definitions, audio_url, is_abbreviation
FROM words
WHERE
  CASE
    -- Same language: strip the non-syllabic diacritic ̯ (U+032F) on both sides
    -- so stored 'aɪ̯ɐ' matches a normalised search suffix of 'aɪɐ', but ɐ
    -- is NOT collapsed to ə — keeping same-language rhymes strict.
    WHEN language = %(source_lang)s
      THEN replace(replace(replace(replace(replace(
               translate(rhyme_part, E'\\u032F', ''),
               'n' || chr(809), chr(601) || 'n'),
               'l' || chr(809), chr(601) || 'l'),
               'm' || chr(809), chr(601) || 'm'),
               'r' || chr(809), chr(601) || 'r'),
               chr(331) || chr(809), chr(601) || chr(331))
             LIKE '%%' || translate(%(rhyme_suffix)s::text, E'\\u032F', '')
    -- Cross-language: additionally collapse ɐ→ə so that e.g. DE 'aɪ̯ɐ'
    -- matches EN 'aɪə' (fire / Eier).
    ELSE
      replace(replace(replace(replace(replace(
          translate(rhyme_part, E'\\u0250\\u032F', E'\\u0259'),
          'n' || chr(809), chr(601) || 'n'),
          'l' || chr(809), chr(601) || 'l'),
          'm' || chr(809), chr(601) || 'm'),
          'r' || chr(809), chr(601) || 'r'),
          chr(331) || chr(809), chr(601) || chr(331))
        LIKE '%%' || translate(%(rhyme_suffix)s::text, E'\\u0250\\u032F', E'\\u0259')
  END
  AND language = ANY(%(target_langs)s)
  AND word NOT LIKE '%% %%'
  AND word NOT LIKE '%%*%%'
  AND (%(include_multiword)s OR is_multiword = FALSE)
  AND is_ghost_word = FALSE
  AND (%(meter)s IS NULL            OR meter           = %(meter)s)
  AND (%(stress_pattern)s IS NULL   OR stress_pattern  = %(stress_pattern)s)
  AND (%(syllable_count)s IS NULL   OR syllable_count  = %(syllable_count)s)
  AND frequency_score >= %(min_frequency)s
  AND LOWER(word) != LOWER(%(search_word)s)
ORDER BY frequency_score DESC
"""


def _fetch_candidates(
    conn: psycopg2.extensions.connection,
    rhyme_part: str,
    rhyme_suffix: str,
    search_word: str,
    source_lang: str,
    target_langs: list[str],
    include_multiword: bool,
    meter: str | None,
    stress_pattern: str | None,
    syllable_count: int | None,
    min_frequency: float,
) -> list[dict[str, Any]]:
    """
    Execute the candidate-fetch query and return a list of row dicts.

    All parameters are bound via psycopg2 parameterisation — no SQL string
    interpolation is performed.
    """
    params = {
        "rhyme_suffix":     rhyme_suffix,
        "source_lang":      source_lang,
        "target_langs":     target_langs,
        "include_multiword": include_multiword,
        "meter":            meter,
        "stress_pattern":   stress_pattern,
        "syllable_count":   syllable_count,
        "min_frequency":    min_frequency,
        "search_word":      search_word,
    }
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(_CANDIDATE_SQL, params)
        return [dict(row) for row in cur.fetchall()]

# ---------------------------------------------------------------------------
# eSpeak fallback for live words
# ---------------------------------------------------------------------------

def _espeak_rhyme_part(word: str, lang: str) -> str | None:
    """
    Call eSpeak to get IPA for *word* and extract its rhyme part.

    Parameters
    ----------
    word:
        Surface form.
    lang:
        ISO 639-1 language code.

    Returns
    -------
    Rhyme part string, or None if eSpeak is unavailable or produces no output.
    """
    ipa = call_espeak(word, lang)
    if not ipa:
        return None
    return extract_rhyme_part(ipa, lang)

# ---------------------------------------------------------------------------
# Main search function
# ---------------------------------------------------------------------------

def find_rhymes(
    word: str,
    source_lang: str,
    target_langs: list[str],
    sort_mode: str = DEFAULT_SORT_MODE,
    meter: str | None = None,
    stress_pattern: str | None = None,
    syllable_count: int | None = None,
    min_frequency: float | None = None,
    include_multiword: bool = False,
    limit: int = DEFAULT_LIMIT,
) -> dict[str, Any]:
    """
    Find rhymes for *word* across one or more languages.

    Parameters
    ----------
    word:
        The word to find rhymes for.
    source_lang:
        Language code of the source word (e.g. 'de', 'en').
    target_langs:
        List of language codes to search in.
    sort_mode:
        Ranking strategy — 'purity', 'usefulness', or 'balanced'.
    meter:
        Optional filter: only return words matching this meter name.
    stress_pattern:
        Optional filter: explicit stress pattern string (overrides meter
        for filtering, both can coexist).
    syllable_count:
        Optional filter: only return words with exactly this many syllables.
    min_frequency:
        If given, skip progressive threshold relaxation and use this value
        directly.  Pass 0.0 to disable the frequency floor entirely.
    include_multiword:
        Include multi-word expressions.
    limit:
        Maximum number of results to return.

    Returns
    -------
    dict with keys:
        'query'   — { word, source_lang, rhyme_part, ipa }
        'results' — list of RhymeResult dicts (sorted by combined_score)
        'meta'    — { total_found, threshold_used, espeak_used }
    """
    espeak_used = False

    with get_db() as conn:
        # ----------------------------------------------------------------
        # Step 1 — look up the search word in the DB
        # ----------------------------------------------------------------
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT ipa, rhyme_part
                FROM words
                WHERE word = %(word)s AND language = %(lang)s
                ORDER BY frequency_score DESC
                LIMIT 1
                """,
                {"word": word, "lang": source_lang},
            )
            row = cur.fetchone()
            # Exact-case miss: try case-insensitive fallback before reaching eSpeak.
            # Handles e.g. "tenor" → "Tenor" while still letting "orange" (adjective)
            # and "Orange" (noun) resolve to their own distinct DB entries when both exist.
            if row is None:
                cur.execute(
                    """
                    SELECT ipa, rhyme_part
                    FROM words
                    WHERE LOWER(word) = LOWER(%(word)s) AND language = %(lang)s
                    ORDER BY frequency_score DESC
                    LIMIT 1
                    """,
                    {"word": word, "lang": source_lang},
                )
                row = cur.fetchone()

        search_ipa: str | None = row["ipa"] if row else None
        search_rhyme_part: str | None = row["rhyme_part"] if row else None

        # ----------------------------------------------------------------
        # Step 2 — word not in DB: call eSpeak on the fly
        # ----------------------------------------------------------------
        if row is None:
            log.debug("'%s' not in DB; calling eSpeak.", word)
            espeak_ipa = call_espeak(word, source_lang)
            if espeak_ipa:
                search_ipa = espeak_ipa
                search_rhyme_part = extract_rhyme_part(espeak_ipa, source_lang)
                espeak_used = True

        # ----------------------------------------------------------------
        # Step 3 — word in DB but rhyme_part is NULL: eSpeak fallback
        # ----------------------------------------------------------------
        elif search_rhyme_part is None:
            log.debug("'%s' in DB but rhyme_part is NULL; calling eSpeak.", word)
            espeak_ipa = call_espeak(word, source_lang)
            if espeak_ipa:
                search_ipa = espeak_ipa
                search_rhyme_part = extract_rhyme_part(espeak_ipa, source_lang)
                espeak_used = True

        if not search_rhyme_part:
            return {
                "query": {
                    "word": word,
                    "source_lang": source_lang,
                    "rhyme_part": None,
                    "ipa": search_ipa,
                },
                "results": [],
                "meta": {
                    "total_found": 0,
                    "threshold_used": None,
                    "espeak_used": espeak_used,
                },
            }

        # Normalise the search rhyme-part so that allophonic variants stored
        # inconsistently in the Kaikki source (e.g. 'ər' vs 'ɐ') don't
        # prevent candidates from being found.
        search_rhyme_part = normalize_rhyme_ipa(search_rhyme_part, source_lang)

        # ----------------------------------------------------------------
        # Step 4 — fetch candidates
        # ----------------------------------------------------------------
        search_rhyme_suffix = _minimal_suffix(search_rhyme_part)

        # Use the caller-supplied frequency floor, or fetch everything and
        # rely on combined_score for ranking.
        effective_threshold: float = min_frequency if min_frequency is not None else 0.0
        candidates = _fetch_candidates(
            conn, search_rhyme_part, search_rhyme_suffix, word, source_lang, target_langs,
            include_multiword,
            meter, stress_pattern, syllable_count,
            effective_threshold,
        )
        threshold_used = effective_threshold

        # ----------------------------------------------------------------
        # Step 5 & 6 — purity scoring and combined score
        # ----------------------------------------------------------------
        results: list[RhymeResult] = []
        for c in candidates:
            if _RE_WORD_HAS_DIGIT.search(c["word"]):
                continue
            cand_rhyme = normalize_rhyme_ipa(c["rhyme_part"] or "", c.get("language"))
            purity = rhyme_part_similarity(search_rhyme_part, cand_rhyme)
            if purity == 0.0:
                continue
            freq = c["frequency_score"] or 0.0
            combined = _combined_score(purity, freq, sort_mode)
            if c.get("language") == "en":
                combined *= _word_form_penalty(c["word"])
            if c.get("language") == "de":
                combined *= _german_word_form_penalty(c["word"])
            if c.get("is_abbreviation") or c["word"].strip().endswith("."):
                combined *= 0.01

            raw_defs = c["definitions"]
            if isinstance(raw_defs, str):
                try:
                    defs = json.loads(raw_defs)
                except (json.JSONDecodeError, TypeError):
                    defs = [raw_defs]
            elif isinstance(raw_defs, list):
                defs = raw_defs
            else:
                defs = []

            results.append(
                RhymeResult(
                    word=c["word"],
                    language=c["language"],
                    ipa=c["ipa"] or "",
                    rhyme_part=cand_rhyme,
                    purity_score=purity,
                    frequency_score=freq,
                    combined_score=combined,
                    syllable_count=c["syllable_count"] or 0,
                    meter=c["meter"],
                    stress_pattern=c["stress_pattern"],
                    pos=c["pos"] or "",
                    definitions=defs,
                    audio_url=c["audio_url"],
                )
            )

        # ----------------------------------------------------------------
        # Step 7 — sort and trim
        # ----------------------------------------------------------------
        results.sort(key=lambda r: r.combined_score, reverse=True)
        total_found = len(results)
        results = results[:limit]

        return {
            "query": {
                "word": word,
                "source_lang": source_lang,
                "rhyme_part": search_rhyme_part,
                "ipa": search_ipa,
            },
            "results": results,
            "meta": {
                "total_found": total_found,
                "threshold_used": threshold_used,
                "espeak_used": espeak_used,
            },
        }

# ---------------------------------------------------------------------------
# Word inspection
# ---------------------------------------------------------------------------

def get_word_data(word: str, lang: str) -> list[dict[str, Any]]:
    """
    Return all database entries for a given (word, language) pair, one dict
    per POS entry.  All columns including raw_kaikki are included.

    Intended for interactive debugging and data-quality inspection via the CLI.

    Parameters
    ----------
    word:
        Surface form to look up.
    lang:
        ISO 639-1/3 language code.

    Returns
    -------
    List of row dicts.  Empty list if the word is not in the DB.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id, word, language, ipa_raw, ipa, ipa_source,
                    rhyme_part, stress_pattern, meter, syllable_count,
                    pos, gender, definitions, etymology,
                    synonyms, antonyms, inflections, hyphenation, audio_url,
                    frequency_score, is_inflected_form, is_multiword,
                    is_abbreviation, is_ghost_word, raw_kaikki
                FROM words
                WHERE word = %(word)s AND language = %(lang)s
                ORDER BY frequency_score DESC, pos
                """,
                {"word": word, "lang": lang},
            )
            return [dict(row) for row in cur.fetchall()]

# ---------------------------------------------------------------------------
# Single-field update
# ---------------------------------------------------------------------------

# Whitelist of fields that may be updated via update_word_field().
# raw_kaikki, id, word, language, pos are intentionally excluded.
_ALLOWED_UPDATE_FIELDS: frozenset[str] = frozenset({
    "ipa", "ipa_raw", "rhyme_part", "stress_pattern", "meter",
    "syllable_count", "definitions", "etymology", "synonyms", "antonyms",
    "gender", "hyphenation", "audio_url",
})


def update_word_field(
    word: str,
    lang: str,
    pos: str,
    field: str,
    value: Any,
) -> bool:
    """
    Update a single field for the (word, language, pos) entry in the DB.

    Only fields in the explicit whitelist may be changed; attempts to update
    raw_kaikki, id, or key columns raise ValueError immediately.

    Special behaviour when field == 'ipa':
        After updating the IPA, the pipeline (extract_rhyme_part,
        extract_stress_pattern, classify_meter) is re-run automatically and
        rhyme_part, stress_pattern, meter, and syllable_count are updated in
        the same transaction.

    Parameters
    ----------
    word, lang, pos:
        Composite key identifying the target row.
    field:
        Column name to update (must be in _ALLOWED_UPDATE_FIELDS).
    value:
        New value.  JSONB fields (definitions, synonyms, antonyms, inflections)
        are accepted as Python lists/dicts and serialised automatically.

    Returns
    -------
    True if a row was updated, False if no matching row was found.

    Raises
    ------
    ValueError
        If *field* is not in the whitelist.
    """
    if field not in _ALLOWED_UPDATE_FIELDS:
        raise ValueError(
            f"Field '{field}' is not allowed.  "
            f"Allowed fields: {sorted(_ALLOWED_UPDATE_FIELDS)}"
        )

    # Serialise JSONB fields.
    if field in ("definitions", "synonyms", "antonyms", "inflections"):
        if not isinstance(value, str):
            value = json.dumps(value, ensure_ascii=False)

    with get_db() as conn:
        # Use a format-safe identifier via psycopg2.extensions.AsIs is risky;
        # instead we validate field against the whitelist above and use a
        # small dispatch dict to build safe queries without f-strings into SQL.
        sql = (
            f"UPDATE words SET {field} = %(value)s "  # noqa: S608 — field is whitelisted
            "WHERE word = %(word)s AND language = %(lang)s AND pos = %(pos)s"
        )
        params: dict[str, Any] = {
            "value": value, "word": word, "lang": lang, "pos": pos,
        }

        with conn.cursor() as cur:
            cur.execute(sql, params)
            updated = cur.rowcount > 0

            # If IPA changed, recompute derived phonetic fields in the same txn.
            if updated and field == "ipa":
                _recompute_phonetics_in_txn(cur, word, lang, pos, str(value))

        conn.commit()
    return updated


def _recompute_phonetics_in_txn(
    cur: psycopg2.extensions.cursor,
    word: str,
    lang: str,
    pos: str,
    ipa: str,
) -> None:
    """
    Recompute and persist rhyme_part, stress_pattern, meter, syllable_count
    for a row inside an already-open transaction.

    Parameters
    ----------
    cur:
        An open psycopg2 cursor (within a transaction).
    word, lang, pos:
        Composite row key.
    ipa:
        New IPA value whose derivatives should be recomputed.
    """
    rhyme_part = extract_rhyme_part(ipa, lang)
    raw_pattern, syl_count = extract_stress_pattern(ipa)
    meter = classify_meter(raw_pattern)

    cur.execute(
        """
        UPDATE words
        SET rhyme_part    = %(rhyme_part)s,
            stress_pattern = %(stress_pattern)s,
            meter          = %(meter)s,
            syllable_count = %(syllable_count)s
        WHERE word = %(word)s AND language = %(lang)s AND pos = %(pos)s
        """,
        {
            "rhyme_part":    rhyme_part,
            "stress_pattern": raw_pattern,
            "meter":         meter,
            "syllable_count": syl_count if syl_count > 0 else None,
            "word": word, "lang": lang, "pos": pos,
        },
    )

# ---------------------------------------------------------------------------
# IPA reprocessing
# ---------------------------------------------------------------------------

def reprocess_ipa(
    word: str,
    lang: str,
    pos: str | None = None,
) -> dict[str, Any]:
    """
    Re-run the full IPA pipeline for a word (bypassing the lru_cache).

    Steps:
        1. Call eSpeak fresh (cache-bypassed via a direct subprocess call).
        2. Run get_authoritative_ipa() with the fresh eSpeak result.
        3. Recompute rhyme_part, stress_pattern, meter, syllable_count.
        4. Persist all derived fields to the DB.
        5. Return a before/after comparison dict.

    Parameters
    ----------
    word:
        Surface form.
    lang:
        ISO 639-1/3 language code.
    pos:
        If given, reprocess only this POS entry; otherwise reprocess all.

    Returns
    -------
    dict with keys:
        'word', 'lang', 'rows_updated', 'details' (list of per-POS before/after)
    """
    import subprocess as _sp  # local import to shadow the module-level reference

    def _fresh_espeak(w: str, l: str) -> str | None:
        """Direct eSpeak call that skips the lru_cache."""
        from phonetics import ESPEAK_AVAILABLE, ESPEAK_LANG_MAP, ESPEAK_TIMEOUT
        if not ESPEAK_AVAILABLE:
            return None
        espeak_lang = ESPEAK_LANG_MAP.get(l, l)
        try:
            result = _sp.run(
                ["espeak-ng", "-v", espeak_lang, "--ipa", "-q", w],
                capture_output=True, text=True,
                encoding="utf-8", errors="replace",
                timeout=ESPEAK_TIMEOUT,
            )
            ipa = result.stdout.strip() if result.stdout else None
            return ipa if ipa else None
        except (FileNotFoundError, _sp.TimeoutExpired):
            return None

    with get_db() as conn:
        # Fetch current rows
        where_pos = "AND pos = %(pos)s" if pos else ""
        sql = f"""
            SELECT id, pos, ipa, ipa_raw, rhyme_part, stress_pattern,
                   meter, syllable_count
            FROM words
            WHERE word = %(word)s AND language = %(lang)s {where_pos}
            ORDER BY frequency_score DESC
        """
        params: dict[str, Any] = {"word": word, "lang": lang}
        if pos:
            params["pos"] = pos

        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = [dict(r) for r in cur.fetchall()]

        details: list[dict[str, Any]] = []
        rows_updated = 0

        fresh_espeak_ipa = _fresh_espeak(word, lang)

        for row in rows:
            before = {k: row[k] for k in
                      ("ipa", "rhyme_part", "stress_pattern", "meter", "syllable_count")}

            new_ipa, new_source = get_authoritative_ipa(row["ipa_raw"], word, lang)
            # Override with fresh eSpeak result if available.
            if fresh_espeak_ipa:
                new_ipa = fresh_espeak_ipa
                new_source = "espeak"

            new_rhyme = extract_rhyme_part(new_ipa, lang) if new_ipa else None
            new_pattern, new_syl = extract_stress_pattern(new_ipa) if new_ipa else (None, 0)
            new_meter = classify_meter(new_pattern)

            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE words
                    SET ipa            = %(ipa)s,
                        ipa_source     = %(ipa_source)s,
                        rhyme_part     = %(rhyme_part)s,
                        stress_pattern = %(stress_pattern)s,
                        meter          = %(meter)s,
                        syllable_count = %(syllable_count)s
                    WHERE id = %(id)s
                    """,
                    {
                        "ipa":           new_ipa,
                        "ipa_source":    new_source,
                        "rhyme_part":    new_rhyme,
                        "stress_pattern": new_pattern,
                        "meter":         new_meter,
                        "syllable_count": new_syl if new_syl > 0 else None,
                        "id":            row["id"],
                    },
                )
                rows_updated += cur.rowcount

            after = {
                "ipa": new_ipa,
                "rhyme_part": new_rhyme,
                "stress_pattern": new_pattern,
                "meter": new_meter,
                "syllable_count": new_syl if new_syl > 0 else None,
            }
            details.append({
                "pos": row["pos"],
                "before": before,
                "after": after,
                "changed": before != after,
            })

        conn.commit()

    return {
        "word": word,
        "lang": lang,
        "rows_updated": rows_updated,
        "details": details,
    }

# ---------------------------------------------------------------------------
# Data quality audit
# ---------------------------------------------------------------------------

def find_data_issues(lang_filter: str | None = None) -> dict[str, Any]:
    """
    Run a set of data-quality queries and return a structured report.

    Checks performed:
        - Words with rhyme_part = NULL, grouped by language
        - Words with ipa_source = 'none', grouped by language
        - Words where syllable_count = 1 but stress_pattern != '1'
        - Words where meter IS NOT NULL but syllable_count = 1
        - Total words per language
        - IPA coverage percentage per language

    Parameters
    ----------
    lang_filter:
        If given, restrict all counts to this language code.

    Returns
    -------
    dict with keys:
        'null_rhyme_part'      — list of {language, count}
        'no_ipa_source'        — list of {language, count}
        'inconsistent_stress'  — list of {language, count}
        'impossible_meter'     — list of {language, count}
        'totals'               — list of {language, total, with_ipa, coverage_pct}
    """
    lang_clause = "AND language = %(lang)s" if lang_filter else ""
    params: dict[str, Any] = {"lang": lang_filter} if lang_filter else {}

    def _run(conn: psycopg2.extensions.connection, sql: str) -> list[dict]:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]

    with get_db() as conn:
        null_rhyme = _run(conn, f"""
            SELECT language, COUNT(*) AS count
            FROM words
            WHERE rhyme_part IS NULL {lang_clause}
            GROUP BY language ORDER BY count DESC
        """)

        no_ipa = _run(conn, f"""
            SELECT language, COUNT(*) AS count
            FROM words
            WHERE ipa_source = 'none' {lang_clause}
            GROUP BY language ORDER BY count DESC
        """)

        inconsistent_stress = _run(conn, f"""
            SELECT language, COUNT(*) AS count
            FROM words
            WHERE syllable_count = 1
              AND stress_pattern IS NOT NULL
              AND stress_pattern != '1' {lang_clause}
            GROUP BY language ORDER BY count DESC
        """)

        impossible_meter = _run(conn, f"""
            SELECT language, COUNT(*) AS count
            FROM words
            WHERE meter IS NOT NULL
              AND syllable_count = 1 {lang_clause}
            GROUP BY language ORDER BY count DESC
        """)

        totals = _run(conn, f"""
            SELECT
                language,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE ipa IS NOT NULL) AS with_ipa,
                ROUND(
                    100.0 * COUNT(*) FILTER (WHERE ipa IS NOT NULL) / NULLIF(COUNT(*), 0),
                    1
                ) AS coverage_pct
            FROM words
            WHERE TRUE {lang_clause}
            GROUP BY language ORDER BY total DESC
        """)

    return {
        "null_rhyme_part":     null_rhyme,
        "no_ipa_source":       no_ipa,
        "inconsistent_stress": inconsistent_stress,
        "impossible_meter":    impossible_meter,
        "totals":              totals,
    }


def find_issues_list(
    lang: str | None = None,
    issue_filter: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Return a list of individual problematic word entries for manual fixing.

    Parameters
    ----------
    lang:
        If given, restrict to this language.
    issue_filter:
        One of: 'no_rhyme_part', 'no_ipa', 'inconsistent_stress',
        'impossible_meter'.  If None, all issues are returned.
    limit:
        Maximum rows to return.

    Returns
    -------
    List of row dicts with columns: word, language, pos, ipa, rhyme_part,
    stress_pattern, meter, syllable_count, frequency_score.
    """
    conditions: list[str] = ["TRUE"]
    if lang:
        conditions.append("language = %(lang)s")
    if issue_filter == "no_rhyme_part":
        conditions.append("rhyme_part IS NULL")
    elif issue_filter == "no_ipa":
        conditions.append("ipa IS NULL")
    elif issue_filter == "inconsistent_stress":
        conditions.append("syllable_count = 1 AND stress_pattern IS NOT NULL AND stress_pattern != '1'")
    elif issue_filter == "impossible_meter":
        conditions.append("meter IS NOT NULL AND syllable_count = 1")

    where = " AND ".join(conditions)
    sql = f"""
        SELECT word, language, pos, ipa, rhyme_part, stress_pattern,
               meter, syllable_count, frequency_score
        FROM words
        WHERE {where}
        ORDER BY language, frequency_score DESC
        LIMIT %(limit)s
    """
    params: dict[str, Any] = {"limit": limit}
    if lang:
        params["lang"] = lang

    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]

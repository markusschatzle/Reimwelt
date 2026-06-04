"""
phonetics.py — Shared IPA utilities and eSpeak wrapper.

Imported by both etl.py and rhyme_engine.py.  Contains no DB code and has
no side-effects on import beyond the single eSpeak startup probe.

Public API
----------
Constants:
    ESPEAK_AVAILABLE      bool
    ESPEAK_LANG_MAP       dict[str, str]
    STRESS_FREE_LANGS     frozenset[str]
    ESPEAK_USEFUL_LANGS   frozenset[str]
    IPA_VOWELS_MULTICHAR  list[str]
    IPA_VOWELS_SINGLE     set[str]

Functions:
    clean_ipa(ipa)                    -> str
    is_vowel_at(ipa, i)               -> tuple[bool, int]
    extract_rhyme_part(ipa)           -> str | None
    extract_stress_pattern(ipa)       -> tuple[str | None, int]
    classify_meter(pattern)           -> str | None
    call_espeak(word, lang)           -> str | None
    get_authoritative_ipa(kaikki_ipa, word, lang) -> tuple[str | None, str]
"""

from __future__ import annotations

import functools
import logging
import os
import re
import subprocess
import unicodedata

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration (read from environment with sensible defaults)
# ---------------------------------------------------------------------------

ESPEAK_TIMEOUT: int = int(os.environ.get("ESPEAK_TIMEOUT", "5"))
ESPEAK_CACHE_SIZE: int = int(os.environ.get("ESPEAK_CACHE_SIZE", "50000"))

# ---------------------------------------------------------------------------
# eSpeak language code overrides
# kaikki lang_code → eSpeak voice code.
# ---------------------------------------------------------------------------

ESPEAK_LANG_MAP: dict[str, str] = {
    "cmn": "zh",   # Mandarin Chinese
    "yue": "zh",   # Cantonese → approximate with Mandarin
    "zsm": "ms",   # Standard Malay
    "hbs": "hr",   # Serbo-Croatian → Croatian voice
    "arb": "ar",   # Modern Standard Arabic
    "pes": "fa",   # Western Farsi
    "swh": "sw",   # Swahili (Coastal)
    "lvs": "lv",   # Standard Latvian
    "ckb": "ku",   # Central Kurdish
}

# Languages where stress does not exist or eSpeak cannot help.
STRESS_FREE_LANGS: frozenset[str] = frozenset({
    "fr",   # French — stress is phrase-final, not lexical
    "ja",   # Japanese — pitch-accent, not dynamic stress
    "cmn",  # Mandarin Chinese
    "yue",  # Cantonese
    "zh",   # generic Chinese
    "vi",   # Vietnamese
    "ko",   # Korean
    "wuu",  # Wu Chinese
    "nan",  # Min Nan Chinese
})

# Languages for which the eSpeak subprocess overhead is warranted.
# These languages frequently omit stress markers in Kaikki IPA, so eSpeak
# is used as a fallback to recover stress and enable meter classification.
ESPEAK_USEFUL_LANGS: frozenset[str] = frozenset({"de", "en"})

# ---------------------------------------------------------------------------
# IPA vowel token lists — ordered longest-first for greedy matching
# ---------------------------------------------------------------------------

IPA_VOWELS_MULTICHAR: list[str] = [
    "aɪ", "aʊ", "ɔʏ", "ɔø", "eɪ", "oʊ", "ɔɪ",  # ɔø = German eu/äu (kaikki transcription)
    "aː", "eː", "iː", "oː", "uː", "yː", "øː", "œː", "ɑː", "ɔː", "ɛː", "ɜː",
    "ʏː", "ɨː", "ʉː",
]

# ʏ (U+028F): German/Swedish ü (near-close near-front rounded)
# ɨ (U+0268): Russian ы, Romanian î/â (close central unrounded)
# ʉ (U+0289): Swedish/Norwegian u (close central rounded)
# ɵ (U+0275): close-mid central rounded (several languages)
# ɚ (U+025A): unstressed rhotic schwa (American English, e.g. "fire" /faɪɚ/)
# ɝ (U+025D): stressed rhotic schwa (American English, e.g. "bird" /bɝd/)
IPA_VOWELS_SINGLE: set[str] = set("aeiouæœøɑɒɔəɛɜɪʊʌyɯɐʏɨʉɵɚɝ")

# Combining diacritics that affect syllabicity.
_NON_SYLLABIC: str = "\u032F"   # ̯  marks a vowel as a non-syllabic glide (e.g. ɐ̯, ɪ̯, ʊ̯)
_SYLLABIC_MARK: str = "\u0329"  # ̩  marks a consonant as a syllable nucleus (e.g. n̩, l̩, m̩)

# ---------------------------------------------------------------------------
# eSpeak startup probe
# ---------------------------------------------------------------------------

def _probe_espeak() -> bool:
    """
    Try to call eSpeak-NG once at import time to check availability.

    Returns True if available, False otherwise.  A single warning is logged
    when eSpeak is absent so the operator knows to install it.
    """
    try:
        result = subprocess.run(
            ["espeak-ng", "--version"],
            capture_output=True,
            text=True,
            timeout=ESPEAK_TIMEOUT,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        log.warning(
            "eSpeak-NG not found on this system.  Words whose kaikki IPA "
            "lacks stress markers will be stored with ipa_source='none' and "
            "NULL phonetic fields.  Install with: "
            "apt install espeak-ng  |  brew install espeak-ng"
        )
        return False


ESPEAK_AVAILABLE: bool = _probe_espeak()

# ---------------------------------------------------------------------------
# Pure IPA utility functions (no I/O)
# ---------------------------------------------------------------------------

def clean_ipa(ipa: str) -> str:
    """
    Strip surrounding / ... / or [ ... ] delimiters and normalise the
    straight apostrophe (') to the proper IPA primary-stress marker (ˈ).

    Parameters
    ----------
    ipa:
        Raw IPA string, possibly with delimiter brackets.

    Returns
    -------
    Cleaned IPA string.
    """
    ipa = ipa.strip()
    ipa = re.sub(r"^[/\[\]]|[/\[\]]$", "", ipa).strip()
    ipa = ipa.replace("'", "ˈ")
    return ipa


def is_vowel_at(ipa: str, i: int) -> tuple[bool, int]:
    """
    Check whether position *i* in *ipa* begins a vowel token.

    Tries multi-character vowels (diphthongs / long vowels) first, then
    single-character vowels.

    Parameters
    ----------
    ipa:
        IPA string (already cleaned).
    i:
        Zero-based character index to test.

    Returns
    -------
    (True, length)  if a vowel token starts at *i*.
    (False, 0)      otherwise.
    """
    for mv in IPA_VOWELS_MULTICHAR:
        end = i + len(mv)
        if ipa[i:end] == mv:
            return True, len(mv)
    ch = ipa[i]
    if ch in IPA_VOWELS_SINGLE:
        return True, 1
    # Handle nasalized/modified vowels whose base character is a known vowel
    # (e.g. ã → a, õ → o, whether precomposed or combining-diacritic form).
    base = unicodedata.normalize("NFD", ch)[0]
    if base in IPA_VOWELS_SINGLE:
        return True, 1
    return False, 0


def extract_rhyme_part(ipa: str, lang: str | None = None) -> str | None:
    """
    Extract the rhyme part: everything from the nucleus of the last stressed
    (or, for stress-free IPA, the last) syllable to the end of the string.

    Two paths:

    Stressed path (IPA contains ˈ):
        1. Find the rightmost ˈ.
        2. Scan forward until a vowel is found.
        3. Return from that vowel to end-of-string.

    No-stress path (French, Japanese, tonal languages):
        Rhyme is anchored at the *last* vowel nucleus — equivalent to the
        final-syllable rhyme rule used in French.

    Parameters
    ----------
    ipa:
        Raw or cleaned IPA string.
    lang:
        Optional ISO 639-1 language code forwarded to _normalize_rhyme_ipa
        for language-specific normalisation.

    Returns
    -------
    Rhyme part string, or None if no vowel nucleus is found.
    """
    ipa = clean_ipa(ipa)
    last_stress = ipa.rfind("ˈ")

    if last_stress != -1:
        remainder = ipa[last_stress + 1:]
        i = 0
        while i < len(remainder):
            is_v, length = is_vowel_at(remainder, i)
            if is_v:
                end = i + length
                has_ns = end < len(remainder) and remainder[end] == _NON_SYLLABIC
                # Single-char vowel + ̯ = non-syllabic glide (ɐ̯, ɪ̯) — not a rhyme anchor.
                if length == 1 and has_ns:
                    i = end + 1
                    continue
                # Diphthong token (ɑɪ, ɑʊ) followed by ̯ is still one syllabic nucleus.
                return _normalize_rhyme_ipa(remainder[i:], lang)
            # Syllabic consonant (n̩, l̩) — valid rhyme anchor.
            if i + 1 < len(remainder) and remainder[i + 1] == _SYLLABIC_MARK:
                return _normalize_rhyme_ipa(remainder[i:], lang)
            i += 1
        return None

    # No-stress path: return from the last syllabic nucleus onward.
    last_vowel_start: int | None = None
    i = 0
    while i < len(ipa):
        is_v, length = is_vowel_at(ipa, i)
        if is_v:
            end = i + length
            has_ns = end < len(ipa) and ipa[end] == _NON_SYLLABIC
            # Single-char vowel + ̯ = non-syllabic glide — skip.
            if length == 1 and has_ns:
                i = end + 1
                continue
            last_vowel_start = i
            i = end + 1 if has_ns else end
        elif i + 1 < len(ipa) and ipa[i + 1] == _SYLLABIC_MARK:
            last_vowel_start = i
            i += 2
        else:
            i += 1
    if last_vowel_start is not None:
        return _normalize_rhyme_ipa(ipa[last_vowel_start:], lang)
    return None


# ---------------------------------------------------------------------------
# Rhyme-part normalisation
# ---------------------------------------------------------------------------

# Language-specific rhyme-part normalisation rules applied after the
# generic rules.  Each entry is a list of (old, new) string replacements
# applied in order.
_LANG_RHYME_NORMS: dict[str, tuple[tuple[str, str], ...]] = {
    # German: Kaikki sometimes stores the /a\u026A/ diphthong (written \u2018ei\u2019
    # in the orthography) with plain ASCII \u2018i\u2019 instead of IPA \u2018\u026A\u2019 (U+026A).
    # This causes the minimal-suffix of e.g. \u2018ai\u2019 to be resolved as bare \u2018i\u2019,
    # making \u2018B\u00e4ckerei\u2019 (rhyme_part \u2018ai\u2019) appear as a rhyme candidate
    # for \u2018Audi\u2019 (rhyme_part \u2018i\u2019) via the LIKE \u2018%i\u2019 query.
    "de": (("ai", "a\u026A"),),
}

# German: long vowel + word-final r \u2192 vocalized \u0250.
# In Standard German (Hochdeutsch), /r/ is vocalized to [\u0250\u032F] after long vowels
# at word boundaries (e.g. /vi\u02D0r/ \u2192 [vi\u02D0\u0250\u032F], /to\u02D0r/ \u2192 [to\u02D0\u0250\u032F]).  Kaikki data
# transcribes this inconsistently \u2014 some entries use 'r', others '\u0250\u032F'/'\u0250'.
# Normalising here unifies both forms so LIKE suffix matching and purity
# scoring treat them as equivalent.  Short-vowel + r is left untouched because
# vocalization is less categorical there (e.g. French loans like "Bistro").
_DE_FINAL_R = re.compile(r"(i\u02D0|e\u02D0|a\u02D0|o\u02D0|u\u02D0|\u00F8\u02D0|y\u02D0|\u025B\u02D0|\u0254\u02D0)r$")


def _normalize_rhyme_ipa(rp: str, lang: str | None = None) -> str:
    """
    Apply phonemic normalisation rules to a rhyme-part string so that
    allophonic variants stored inconsistently in the Kaikki source data
    are collapsed to a single canonical form.

    Rules applied (in order):
      1. Strip syllable-boundary dots ('.'): they are segmentation metadata,
         not phonemic, and break LIKE-suffix matching.
      2. Schwa + r  →  near-open central (ɐ): In German (and broadly in
         European IPA transcriptions), unstressed 'ər' and 'ɐ' represent
         the same vocalized-r syllable.  Kaikki data uses both inconsistently
         — normalising to 'ɐ' makes LIKE queries and purity scoring reliable.
      3. Language-specific rules from _LANG_RHYME_NORMS (e.g. German
         'ai' → 'aɪ' to convert the Kaikki plain-ASCII diphthong encoding).

    Parameters
    ----------
    rp:
        Extracted rhyme-part IPA string.
    lang:
        Optional ISO 639-1 language code for language-specific normalisations.

    Returns
    -------
    Normalised rhyme-part string.
    """
    # Strip syllable-boundary dots
    rp = rp.replace(".", "")
    # Strip non-syllabic diacritic ̯ (U+032F): marks a vowel as a glide within a
    # diphthong (e.g. aɪ̯, ʊ̯).  It is redundant for rhyme matching because the
    # diphthong token (aɪ) is already recognised as a unit; keeping ̯ causes
    # mis-tokenisation and prevents LIKE suffix matches across languages.
    rp = rp.replace("\u032F", "")
    # Schwa + r (ər) → near-open central (ɐ)
    rp = rp.replace("\u0259r", "\u0250")
    if lang is not None:
        for old, new in _LANG_RHYME_NORMS.get(lang, ()):
            rp = rp.replace(old, new)
        if lang == "de":
            rp = _DE_FINAL_R.sub(r"\1ɐ", rp)
    return rp


def normalize_rhyme_ipa(rp: str, lang: str | None = None) -> str:
    """Public alias for _normalize_rhyme_ipa (used by rhyme_engine)."""
    return _normalize_rhyme_ipa(rp, lang)


def extract_stress_pattern(ipa: str) -> tuple[str | None, int]:
    """
    Build a syllable-level stress pattern string and count syllables.

    Walk the IPA character-by-character, tracking the most recent stress
    marker encountered before each vowel nucleus:
        ˈ  → primary stress   → '1'
        ˌ  → secondary stress → '2'
        (none)                → '0'

    Parameters
    ----------
    ipa:
        Raw or cleaned IPA string.

    Returns
    -------
    (pattern_string, syllable_count) where pattern_string is e.g. '10' and
    syllable_count is the number of vowel nuclei detected.
    Returns (None, 0) if no vowel nuclei are found.
    """
    ipa = clean_ipa(ipa)
    pattern: list[str] = []
    pending_stress = "0"
    i = 0
    while i < len(ipa):
        ch = ipa[i]
        if ch == "ˈ":
            pending_stress = "1"
            i += 1
            continue
        if ch == "ˌ":
            pending_stress = "2"
            i += 1
            continue
        is_v, length = is_vowel_at(ipa, i)
        if is_v:
            end = i + length
            has_ns = end < len(ipa) and ipa[end] == _NON_SYLLABIC
            # Single-char vowel + ̯ = non-syllabic glide (ɐ̯, ɪ̯) — skip.
            if length == 1 and has_ns:
                i = end + 1
                continue
            # Diphthong token (ɑɪ, ɑʊ) + ̯: the ̯ marks the offglide only;
            # the diphthong is still one syllabic nucleus. Consume the ̯.
            pattern.append(pending_stress)
            pending_stress = "0"
            i = end + 1 if has_ns else end
            continue
        # Syllabic consonant (n̩, l̩, m̩) — counts as a nucleus.
        if i + 1 < len(ipa) and ipa[i + 1] == _SYLLABIC_MARK:
            pattern.append(pending_stress)
            pending_stress = "0"
            i += 2
            continue
        i += 1

    if not pattern:
        return None, 0
    return "".join(pattern), len(pattern)


def classify_meter(pattern: str | None) -> str | None:
    """
    Map a stress pattern string to a classical meter name, or None.

    Recognised meters (repeating unit → name):
        01   → iamb
        10   → trochee
        100  → dactyl
        001  → anapest
        11   → spondee
        010  → amphibrach

    Parameters
    ----------
    pattern:
        Stress pattern string such as '10' or '0100'.

    Returns
    -------
    Meter name string, or None if no recognised meter matches.
    """
    if not pattern:
        return None
    # Treat secondary stress (2) as unstressed (0) for foot-based meter
    # classification.  In classical meter only the primary beat (1) defines
    # the foot; secondary stress is a phonological, not metrical, distinction.
    # e.g. dragonfly: '102' → '100' → dactyl
    #      afternoon:  '201' → '001' → anapest
    normalized = pattern.replace("2", "0")
    # If there is no primary stress at all, meter is indeterminate.
    if "1" not in normalized:
        return None
    meters: dict[str, str] = {
        "iamb":       r"^(01)+$",
        "trochee":    r"^(10)+$",
        "dactyl":     r"^(100)+$",
        "anapest":    r"^(001)+$",
        "spondee":    r"^(11)+$",
        "amphibrach": r"^(010)+$",
    }
    for name, rx in meters.items():
        if re.match(rx, normalized):
            return name
    # Non-repeating trisyllabic feet (classical Latin/Greek names).
    # These occur when a word has mixed stress that doesn't form a clean
    # repeating unit — e.g. "strategy" 1-0-1 = amphimacer.
    _TRISYLLABIC: dict[str, str] = {
        "101": "amphimacer",    # stress – unstress – stress  (cretic)
        "110": "antibacchius",  # stress – stress – unstress
        "011": "bacchius",      # unstress – stress – stress
        "111": "molossus",      # stress – stress – stress
    }
    if normalized in _TRISYLLABIC:
        return _TRISYLLABIC[normalized]
    return None

# ---------------------------------------------------------------------------
# eSpeak-NG integration
# ---------------------------------------------------------------------------

@functools.lru_cache(maxsize=50_000)
def call_espeak(word: str, lang: str) -> str | None:
    """
    Call eSpeak-NG to generate IPA with stress markers for *word* in *lang*.

    The result is memoised with lru_cache because a single word may appear
    many times in a kaikki dump (one entry per POS sense) and repeated
    subprocess invocations for the same (word, lang) pair are wasteful.

    The cache size is controlled by the ESPEAK_CACHE_SIZE environment
    variable (default 50 000).  Note: lru_cache maxsize is fixed at import
    time; use ESPEAK_CACHE_SIZE to tune before starting the process.

    Parameters
    ----------
    word:
        Surface form to transcribe.
    lang:
        ISO 639-1/3 language code (kaikki convention).

    Returns
    -------
    IPA string (stripped), or None if eSpeak is unavailable, times out,
    or produces empty output.
    """
    if not ESPEAK_AVAILABLE:
        return None

    espeak_lang = ESPEAK_LANG_MAP.get(lang, lang)

    try:
        result = subprocess.run(
            ["espeak-ng", "-v", espeak_lang, "--ipa", "-q", word],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=ESPEAK_TIMEOUT,
        )
        ipa = result.stdout.strip() if result.stdout else None
        return ipa if ipa else None
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None


def get_authoritative_ipa(
    kaikki_ipa: str | None,
    word: str,
    lang: str,
) -> tuple[str | None, str]:
    """
    Return (authoritative_ipa, source) where source ∈ {'kaikki', 'espeak', 'none'}.

    Decision rules (applied in order):
        1. kaikki IPA exists AND contains ˈ or ˌ → use directly (source='kaikki').
        2. Language is in STRESS_FREE_LANGS → use kaikki IPA verbatim if
           available, else 'none' (eSpeak cannot add meaningful stress here).
        3. Language NOT in ESPEAK_USEFUL_LANGS → use kaikki IPA verbatim if
           available, else 'none' (skip subprocess overhead).
        4. kaikki IPA exists but lacks stress (whitelisted lang) → call eSpeak.
        5. kaikki IPA is None (whitelisted lang) → call eSpeak.
        6. eSpeak also failed but kaikki IPA exists → use kaikki as last resort.

    Parameters
    ----------
    kaikki_ipa:
        Raw IPA string from the kaikki dump, or None.
    word:
        Surface form (used for eSpeak fallback).
    lang:
        ISO 639-1/3 language code.

    Returns
    -------
    (ipa_string_or_none, source_label)
    """
    if kaikki_ipa and ("ˈ" in kaikki_ipa or "ˌ" in kaikki_ipa):
        return kaikki_ipa, "kaikki"

    if lang in STRESS_FREE_LANGS:
        return (kaikki_ipa, "kaikki") if kaikki_ipa else (None, "none")

    if lang not in ESPEAK_USEFUL_LANGS:
        return (kaikki_ipa, "kaikki") if kaikki_ipa else (None, "none")

    espeak_ipa = call_espeak(word, lang)
    if espeak_ipa:
        return espeak_ipa, "espeak"

    if kaikki_ipa:
        return kaikki_ipa, "kaikki"

    return None, "none"

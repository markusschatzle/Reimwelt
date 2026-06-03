"""
Migration: normalize German rhyme_parts — plain 'ai' (ASCII i) → 'aɪ' (IPA ɪ, U+026A).

Kaikki sometimes stores the German /aɪ/ diphthong (orthographic 'ei') using plain
ASCII 'i' instead of the canonical IPA near-close near-front unrounded vowel 'ɪ'.
This causes _minimal_suffix() to return bare 'i' for e.g. 'Bäckerei' (rhyme_part 'ai'),
making it appear as a spurious rhyme match for words whose only rhyme is plain 'i'
(e.g. 'Audi', rhyme_part 'i') via the LIKE '%i' query.

Only German rows are touched; 'ai' is a legitimate two-vowel sequence in Italian,
Spanish, Welsh, Ancient Greek, and many other languages.
"""
import os
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from dotenv import load_dotenv
load_dotenv()
import psycopg2

conn = psycopg2.connect(os.environ.get('DATABASE_URL', 'postgresql://postgres:Kronleuchter1!@localhost:5432/rhymes'))
cur = conn.cursor()

# ── Count before ──────────────────────────────────────────────────────────────
cur.execute(
    "SELECT COUNT(*) FROM words WHERE language = 'de' AND rhyme_part LIKE '%' || 'ai' || '%'"
)
before = cur.fetchone()[0]
print(f"German rows containing plain 'ai' in rhyme_part (before): {before}")

# ── Apply fix ─────────────────────────────────────────────────────────────────
# Replace every occurrence of plain ASCII 'i' (U+0069) after 'a' with IPA 'ɪ'
# (U+026A = LATIN SMALL LETTER SMALL CAPITAL I).
# Using chr() avoids any shell/quoting issues with the IPA character.
AI_PLAIN = 'ai'          # a (U+0061) + i (U+0069)
AI_IPA   = 'a\u026A'    # a (U+0061) + ɪ (U+026A)

cur.execute(
    """
    UPDATE words
    SET rhyme_part = REPLACE(rhyme_part, %(old)s, %(new)s)
    WHERE language = 'de'
      AND rhyme_part LIKE %(pattern)s
    """,
    {"old": AI_PLAIN, "new": AI_IPA, "pattern": '%' + AI_PLAIN + '%'},
)
updated = cur.rowcount
conn.commit()
print(f"Rows updated: {updated}")

# ── Verify ────────────────────────────────────────────────────────────────────
cur.execute(
    "SELECT COUNT(*) FROM words WHERE language = 'de' AND rhyme_part LIKE '%' || 'ai' || '%'"
)
after = cur.fetchone()[0]
print(f"German rows containing plain 'ai' in rhyme_part (after):  {after}")

# Sample corrected rows
AI_IPA_LIKE = '%' + AI_IPA + '%'
cur.execute(
    """
    SELECT word, ipa, rhyme_part
    FROM words
    WHERE language = 'de'
      AND rhyme_part LIKE %s
    ORDER BY frequency_score DESC
    LIMIT 10
    """,
    (AI_IPA_LIKE,),
)
print("\nSample corrected rows (top 10 by frequency):")
for row in cur.fetchall():
    print(f"  {row[0]!r:22s}  ipa={row[1]!r:32s}  rhyme_part={row[2]!r}")

print("\nDone.")

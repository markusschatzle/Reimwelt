"""Debug script for backte rhyme search issue."""
from dotenv import load_dotenv
load_dotenv()
import psycopg2, os, json

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

# 1. Check backte in DB
cur.execute(
    "SELECT word, language, ipa, rhyme_part, is_inflected_form, is_ghost_word, frequency_score "
    "FROM words WHERE word = %s AND language = %s",
    ("backte", "de"),
)
rows = cur.fetchall()
print("=== backte in DB ===")
for r in rows:
    print(r)

# 2. Check kackte, nackte, Takte in DB
print("\n=== Expected rhymes in DB ===")
for w in ["kackte", "nackte", "Takte", "Erstkontakte", "packte", "hackte"]:
    cur.execute(
        "SELECT word, language, ipa, rhyme_part, is_inflected_form, is_ghost_word, frequency_score "
        "FROM words WHERE LOWER(word) = LOWER(%s) AND language = %s",
        (w, "de"),
    )
    rows = cur.fetchall()
    print(f"  {w}: {rows}")

# 3. Compute what the search query would use
from phonetics import extract_rhyme_part, clean_ipa
from rhyme_engine import _minimal_suffix

# Use eSpeak to get IPA for backte
from phonetics import call_espeak
espeak_ipa = call_espeak("backte", "de")
print(f"\n=== eSpeak IPA for backte: {espeak_ipa!r} ===")

if espeak_ipa:
    rp = extract_rhyme_part(espeak_ipa)
    print(f"rhyme_part from eSpeak: {rp!r}")
    if rp:
        suffix = _minimal_suffix(rp)
        print(f"_minimal_suffix: {suffix!r}")

# 4. Check DB rhyme_part for backte
cur.execute(
    "SELECT ipa, rhyme_part FROM words WHERE word = %s AND language = %s ORDER BY frequency_score DESC LIMIT 1",
    ("backte", "de"),
)
row = cur.fetchone()
if row:
    db_ipa, db_rp = row
    print(f"\nDB IPA: {db_ipa!r}")
    print(f"DB rhyme_part: {db_rp!r}")
    if db_rp:
        suffix = _minimal_suffix(db_rp)
        print(f"_minimal_suffix of DB rhyme_part: {suffix!r}")

        # 5. Run the actual SQL query
        print(f"\n=== SQL query with suffix={suffix!r} ===")
        cur.execute(
            """
            SELECT word, language, ipa, rhyme_part, is_inflected_form, is_ghost_word, frequency_score
            FROM words
            WHERE rhyme_part LIKE %s
              AND language = ANY(%s)
            ORDER BY frequency_score DESC
            LIMIT 100
            """,
            ("%" + suffix, ["de"]),
        )
        all_rows = cur.fetchall()
        print(f"Total matching (no filters): {len(all_rows)}")
        for r in all_rows[:30]:
            print(f"  {r}")

        # 6. With is_ghost_word filter
        print(f"\n=== With is_ghost_word=FALSE filter ===")
        cur.execute(
            """
            SELECT word, language, ipa, rhyme_part, is_inflected_form, is_ghost_word, frequency_score
            FROM words
            WHERE rhyme_part LIKE %s
              AND language = ANY(%s)
              AND is_ghost_word = FALSE
            ORDER BY frequency_score DESC
            LIMIT 100
            """,
            ("%" + suffix, ["de"]),
        )
        ghost_rows = cur.fetchall()
        print(f"Total matching (ghost excluded): {len(ghost_rows)}")

        # 7. With is_inflected_form filter
        print(f"\n=== With is_inflected_form=FALSE filter ===")
        cur.execute(
            """
            SELECT word, language, ipa, rhyme_part, is_inflected_form, is_ghost_word, frequency_score
            FROM words
            WHERE rhyme_part LIKE %s
              AND language = ANY(%s)
              AND is_inflected_form = FALSE
            ORDER BY frequency_score DESC
            LIMIT 100
            """,
            ("%" + suffix, ["de"]),
        )
        infl_rows = cur.fetchall()
        print(f"Total matching (inflected excluded): {len(infl_rows)}")
        for r in infl_rows[:30]:
            print(f"  {r}")

conn.close()
print("\nDone.")

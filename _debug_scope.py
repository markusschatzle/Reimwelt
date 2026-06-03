"""Check scope of the backfill needed."""
from dotenv import load_dotenv; load_dotenv()
import psycopg2, os
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

# Count by language
cur.execute("""
SELECT language, COUNT(*) as total,
       SUM(CASE WHEN ipa IS NULL THEN 1 ELSE 0 END) as null_ipa,
       SUM(CASE WHEN ipa IS NULL AND is_multiword = FALSE THEN 1 ELSE 0 END) as null_ipa_single
FROM words
WHERE language IN ('de', 'en')
GROUP BY language
""")
for r in cur.fetchall():
    print(f"lang={r[0]}: total={r[1]}, null_ipa={r[2]}, null_ipa_single_word={r[3]}")

# Quick eSpeak test on a few words
from phonetics import call_espeak
for w in ["backte", "kackte", "nackte", "Takte", "Erstkontakte", "packten", "Rakte"]:
    ipa = call_espeak(w, "de")
    print(f"  eSpeak('{w}') = {ipa!r}")

conn.close()

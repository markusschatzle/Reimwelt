from dotenv import load_dotenv; load_dotenv()
import psycopg2, os
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM words WHERE language='de'")
total = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM words WHERE language='de' AND rhyme_part IS NULL")
null_rp = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM words WHERE language='de' AND ipa IS NULL")
null_ipa = cur.fetchone()[0]
print(f"Total German words: {total}")
print(f"NULL rhyme_part: {null_rp} ({null_rp/total*100:.1f}%)")
print(f"NULL ipa: {null_ipa} ({null_ipa/total*100:.1f}%)")

# What do words with NULL ipa look like?
cur.execute("""
SELECT word, ipa_raw, ipa_source, is_ghost_word, frequency_score
FROM words WHERE language='de' AND ipa IS NULL
ORDER BY frequency_score DESC LIMIT 20
""")
print("\nSample words with NULL ipa (sorted by freq):")
for r in cur.fetchall():
    print(" ", r)

conn.close()

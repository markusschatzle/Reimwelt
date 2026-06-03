import psycopg2, sys, io, json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
conn = psycopg2.connect("postgresql://postgres:Kronleuchter1!@localhost:5432/rhymes")
cur = conn.cursor()

# Check available counts and sample words per language
for lang, label in [("fr", "French"), ("ja", "Japanese")]:
    cur.execute("SELECT COUNT(*) FROM words WHERE language=%s", (lang,))
    count = cur.fetchone()[0]
    cur.execute("SELECT word FROM words WHERE language=%s LIMIT 10", (lang,))
    samples = [r[0] for r in cur.fetchall()]
    print(f"{label} ({lang}): {count} rows | samples: {samples}")

cur.close(); conn.close()
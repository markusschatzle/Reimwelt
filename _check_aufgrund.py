import psycopg2, os
conn = psycopg2.connect(os.environ.get('DATABASE_URL', 'postgresql://postgres:Kronleuchter1!@localhost:5432/rhymes'))
cur = conn.cursor()
cur.execute(
    "UPDATE words SET syllable_count = 2, meter = 'iamb', stress_pattern = '01' WHERE lower(word) = 'aufgrund'"
)
print(f"Updated {cur.rowcount} row(s)")
conn.commit()
conn.close()

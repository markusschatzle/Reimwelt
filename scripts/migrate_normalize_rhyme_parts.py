"""
migrate_normalize_rhyme_parts.py
One-time migration: normalize rhyme_part values in the words table.

Changes applied:
  1. Replace 'ər' (schwa + r) with 'ɐ' (near-open central) — these are
     allophonic variants of the German vocalized-r syllable, stored
     inconsistently by the Kaikki data source.
  2. Remove syllable-boundary dots ('.') which break LIKE-suffix matching.

Run once:
    python migrate_normalize_rhyme_parts.py
"""
import os
from dotenv import load_dotenv
load_dotenv()
import psycopg2

conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True   # start in autocommit for DDL
cur = conn.cursor()

# Count before
cur.execute("SELECT COUNT(*) FROM words WHERE rhyme_part LIKE '%%\u0259r%%' OR rhyme_part LIKE '%%.%%'")
before = cur.fetchone()[0]
print(f"Rows needing normalization (ər or dot): {before}")

# Drop rhyme_part indexes to allow efficient bulk update
print("Dropping rhyme_part indexes...")
cur.execute("DROP INDEX IF EXISTS idx_rhyme_cross")
cur.execute("DROP INDEX IF EXISTS idx_rhyme_lang")
print("  Dropped idx_rhyme_cross and idx_rhyme_lang")

# Switch to transactional mode for the data updates
conn.autocommit = False

# Apply in batches
batch_size = 50000
total_updated = 0

while True:
    cur.execute("""
        UPDATE words
        SET rhyme_part = REPLACE(REPLACE(rhyme_part, '\u0259r', '\u0250'), '.', '')
        WHERE id IN (
            SELECT id FROM words
            WHERE rhyme_part LIKE '%%\u0259r%%' OR rhyme_part LIKE '%%.%%'
            LIMIT %(batch)s
        )
    """, {"batch": batch_size})
    rows = cur.rowcount
    conn.commit()
    total_updated += rows
    print(f"  Updated {rows} rows (total so far: {total_updated})")
    if rows == 0:
        break

# Recreate indexes
print("Recreating rhyme_part indexes...")
conn.autocommit = True
cur.execute("CREATE INDEX idx_rhyme_cross ON words USING btree (rhyme_part)")
cur.execute("CREATE INDEX idx_rhyme_lang  ON words USING btree (language, rhyme_part)")
print("  Recreated.")

print(f"\nDone. Total rows normalized: {total_updated}")

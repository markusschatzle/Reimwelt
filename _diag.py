from dotenv import load_dotenv; load_dotenv()
import psycopg2, os

INDEXES = {
    "idx_rhyme_cross": "CREATE INDEX idx_rhyme_cross ON public.words USING btree (rhyme_part)",
    "idx_rhyme_lang":  "CREATE INDEX idx_rhyme_lang  ON public.words USING btree (language, rhyme_part)",
    "idx_stress":      "CREATE INDEX idx_stress       ON public.words USING btree (language, stress_pattern)",
    "idx_syllables":   "CREATE INDEX idx_syllables    ON public.words USING btree (language, syllable_count)",
    "idx_meter":       "CREATE INDEX idx_meter        ON public.words USING btree (language, meter)",
}

conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
cur = conn.cursor()

import sys
action = sys.argv[1] if len(sys.argv) > 1 else "drop"

if action == "drop":
    for name in INDEXES:
        print(f"Dropping {name}...")
        cur.execute(f"DROP INDEX IF EXISTS {name}")
    print("All done. Now run: python fix_missing_phonetics.py --phase3-only")
elif action == "create":
    for name, ddl in INDEXES.items():
        print(f"Creating {name}...")
        cur.execute(ddl)
    print("All indexes recreated.")

conn.close()

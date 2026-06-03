import psycopg2, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

conn = psycopg2.connect("postgresql://postgres:Kronleuchter1!@localhost:5432/rhymes")
cur = conn.cursor()
cur.execute("""
    SELECT id, word, language, pos, gender,
           ipa_raw, ipa, ipa_source,
           rhyme_part, stress_pattern, meter, syllable_count,
           hyphenation, round(frequency_score::numeric, 8) AS frequency_score,
           is_inflected_form, is_multiword, is_abbreviation, is_ghost_word,
           audio_url,
           left(etymology,120) AS etymology,
           definitions::text,
           synonyms::text,
           left(inflections::text,200) AS inflections
    FROM words
    WHERE language = 'de'
      AND word IN ('Haus','laufen','sch\u00f6n','Freiheit','Wasser','dunkel')
    ORDER BY word, pos
""")
cols = [d[0] for d in cur.description]
rows = cur.fetchall()
print(f"Got {len(rows)} rows\n")
for row in rows:
    print("=" * 60)
    for col, val in zip(cols, row):
        print(f"  {col:20s}: {val}")
print("Done.")
cur.close()
conn.close()
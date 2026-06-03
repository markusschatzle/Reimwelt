"""
Sample query: French and Japanese entries from the words table.
Writes UTF-8 output to sample_fr_ja.txt.
"""
import psycopg2, json, io, sys

DSN = "postgresql://postgres:Kronleuchter1!@localhost:5432/rhymes"

# ── French test words: accents, ligatures, cedilla, IPA stress ──────────────
FR_WORDS = [
    "être",    # accent + silent letters
    "déjà",    # acute + grave
    "liberté", # political vocab, 3 syllables
    "château", # circumflex
    "français",# cedilla
    "sœur",    # oe-ligature
    "nuit",    # silent final consonant
    "eau",     # unusual spelling (water)
    "chanter", # common verb
    "beau",    # adj, irregular forms
]

# ── Japanese test words: we pick from whatever landed in the DB ──────────────
# Some early entries are romaji/kana page-titles; kanji ones come later.
JA_SPECIAL_WORDS = [
    "猫",       # neko – cat (kanji)
    "桜",       # sakura – cherry blossom
    "食べる",   # taberu – to eat
    "東京",     # Tokyo
    "日本語",   # nihongo – Japanese language
    "ありがとう",# arigatou – thank you
    "水",       # mizu – water
    "山",       # yama – mountain
    "愛",       # ai – love
    "空",       # sora – sky
]

COLS = [
    "id", "word", "language", "pos", "gender",
    "ipa_raw", "ipa", "ipa_source",
    "rhyme_part", "stress_pattern", "meter", "syllable_count",
    "hyphenation", "frequency_score",
    "is_inflected_form", "is_multiword", "is_abbreviation", "is_ghost_word",
    "audio_url", "etymology", "definitions", "synonyms", "inflections",
]

SELECT_SQL = """
    SELECT {cols}
    FROM words
    WHERE language = %s AND word = ANY(%s)
    ORDER BY word, pos
""".format(cols=", ".join(COLS))

RANDOM_SQL = """
    SELECT {cols}
    FROM words
    WHERE language = %s
      AND ipa IS NOT NULL
    ORDER BY random()
    LIMIT 5
""".format(cols=", ".join(COLS))

SEP  = "─" * 72
SEP2 = "═" * 72

def fmt_row(row: tuple, col_names: list[str]) -> str:
    lines = []
    d = dict(zip(col_names, row))
    lines.append(f"  word        : {d['word']}  [{d['pos']}]  lang={d['language']}")
    lines.append(f"  ipa_raw     : {d['ipa_raw']}")
    lines.append(f"  ipa         : {d['ipa']}  (source: {d['ipa_source']})")
    lines.append(f"  rhyme_part  : {d['rhyme_part']}")
    lines.append(f"  stress      : {d['stress_pattern']}  |  meter: {d['meter']}  |  syllables: {d['syllable_count']}")
    lines.append(f"  hyphenation : {d['hyphenation']}  |  freq: {d['frequency_score']}")
    flags = []
    if d['is_inflected_form']: flags.append("inflected")
    if d['is_multiword']:      flags.append("multiword")
    if d['is_abbreviation']:   flags.append("abbreviation")
    if d['is_ghost_word']:     flags.append("ghost")
    lines.append(f"  flags       : {', '.join(flags) or '—'}")
    lines.append(f"  audio       : {d['audio_url']}")
    # Definitions (first 3)
    try:
        defs = json.loads(d['definitions']) if d['definitions'] else []
        lines.append(f"  definitions : {' / '.join(defs[:3])}")
    except Exception:
        lines.append(f"  definitions : {d['definitions']}")
    # Inflections (first 4 forms)
    try:
        infl = json.loads(d['inflections']) if d['inflections'] else []
        short = [f"{x.get('form','?')} ({','.join(x.get('tags',[])[:2])})" for x in infl[:4]]
        lines.append(f"  inflections : {' | '.join(short)}")
    except Exception:
        lines.append(f"  inflections : {str(d['inflections'])[:120]}")
    return "\n".join(lines)


def section(title: str, rows: list, col_names: list[str]) -> list[str]:
    out = [SEP2, title, SEP2]
    if not rows:
        out.append("  (no matching rows in DB yet)")
    else:
        for row in rows:
            out.append(SEP)
            out.append(fmt_row(row, col_names))
    out.append("")
    return out


def main():
    conn = psycopg2.connect(DSN)
    cur  = conn.cursor()

    output: list[str] = []
    output.append("SAMPLE ETL OUTPUT — French & Japanese")
    output.append(f"Generated: 2026-04-23")
    output.append("")

    # ── French ────────────────────────────────────────────────────────────────
    cur.execute(SELECT_SQL, ("fr", FR_WORDS))
    fr_rows = cur.fetchall()

    cur.execute(RANDOM_SQL, ("fr",))
    fr_random = cur.fetchall()

    output += section("FRENCH — targeted words (accents, ligatures, cedilla)", fr_rows, COLS)
    output += section("FRENCH — 5 random words with IPA", fr_random, COLS)

    # ── Japanese ─────────────────────────────────────────────────────────────
    cur.execute(SELECT_SQL, ("ja", JA_SPECIAL_WORDS))
    ja_rows = cur.fetchall()

    cur.execute(RANDOM_SQL, ("ja",))
    ja_random = cur.fetchall()

    output += section("JAPANESE — targeted words (kanji, hiragana, compounds)", ja_rows, COLS)
    output += section("JAPANESE — 5 random words with IPA", ja_random, COLS)

    # ── Summary stats ─────────────────────────────────────────────────────────
    cur.execute("SELECT language, COUNT(*), SUM(CASE WHEN ipa IS NOT NULL THEN 1 ELSE 0 END) FROM words WHERE language IN ('fr','ja') GROUP BY language ORDER BY language")
    stats = cur.fetchall()
    output.append(SEP2)
    output.append("STATS")
    output.append(SEP2)
    for lang, total, with_ipa in stats:
        pct = 100 * with_ipa / total if total else 0
        output.append(f"  {lang}: {total:,} rows  |  {with_ipa:,} with IPA ({pct:.1f}%)")

    cur.close()
    conn.close()

    text = "\n".join(output) + "\n"
    with open("F:/Reimmaschine_v3/sample_fr_ja.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Written {len(text):,} bytes → sample_fr_ja.txt")


if __name__ == "__main__":
    main()

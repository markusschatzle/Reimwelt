from dotenv import load_dotenv; load_dotenv()
import psycopg2, os, sys, io, json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

CHECKPOINT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_debug_null_ipa_all_checkpoint.json")

def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_checkpoint(state):
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

def print_lang_result(lang, entry):
    total = entry["total"]
    null_rp = entry["null_rp"]
    null_ipa = entry["null_ipa"]
    pct_rp = null_rp / total * 100 if total else 0
    pct_ipa = null_ipa / total * 100 if total else 0
    print(f"\n=== {lang} ===")
    print(f"Total words: {total}")
    print(f"NULL rhyme_part: {null_rp} ({pct_rp:.1f}%)")
    print(f"NULL ipa: {null_ipa} ({pct_ipa:.1f}%)")
    if entry["sample_rows"]:
        print("Sample words with NULL ipa (sorted by freq):")
        for r in entry["sample_rows"]:
            print(" ", tuple(r))
    else:
        print("No words with NULL ipa.")

print(f"[checkpoint] path: {CHECKPOINT_FILE}")
print(f"[checkpoint] exists: {os.path.exists(CHECKPOINT_FILE)}")
checkpoint = load_checkpoint()
print(f"[checkpoint] loaded {len(checkpoint)} language(s): {list(checkpoint.keys())}")

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

cur.execute("SELECT DISTINCT language FROM words WHERE language NOT IN ('de','en','fr') ORDER BY language")
langs = [r[0] for r in cur.fetchall()]
print("Languages found:", langs)

# Re-print already completed languages from cache
for lang in langs:
    if lang in checkpoint:
        print(f"(resuming from checkpoint) ", end="")
        print_lang_result(lang, checkpoint[lang])

try:
    for lang in langs:
        if lang in checkpoint:
            continue  # already done

        print(f"\n[processing {lang}...]", flush=True)
        cur.execute("SELECT COUNT(*) FROM words WHERE language=%s", (lang,))
        total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM words WHERE language=%s AND rhyme_part IS NULL", (lang,))
        null_rp = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM words WHERE language=%s AND ipa IS NULL", (lang,))
        null_ipa = cur.fetchone()[0]
        cur.execute("""
            SELECT word, ipa_raw, ipa_source, is_ghost_word, frequency_score
            FROM words WHERE language=%s AND ipa IS NULL
            ORDER BY frequency_score DESC LIMIT 20
        """, (lang,))
        sample_rows = [list(r) for r in cur.fetchall()]

        entry = {
            "total": total,
            "null_rp": null_rp,
            "null_ipa": null_ipa,
            "sample_rows": sample_rows,
        }
        checkpoint[lang] = entry
        save_checkpoint(checkpoint)
        print(f"[checkpoint saved: {len(checkpoint)} language(s)]", flush=True)
        print_lang_result(lang, entry)

except KeyboardInterrupt:
    print(f"\n[interrupted] Progress saved for {len(checkpoint)} language(s). Re-run to continue.", flush=True)
finally:
    conn.close()

# If all languages are done, remove the checkpoint file
if all(lang in checkpoint for lang in langs):
    os.remove(CHECKPOINT_FILE)
    print("\nAll languages processed. Checkpoint file removed.")

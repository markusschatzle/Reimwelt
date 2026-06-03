import os
from dotenv import load_dotenv
load_dotenv()
from rhyme_engine import find_rhymes

# Scan many English words to find any where a hyphenated word appears in top 5
test_words = ["Peter", "orange", "silver", "purple", "month", "cat", "happy",
              "dinner", "flower", "window", "sister", "river", "angel", "paper",
              "tiger", "water", "summer", "winter", "mother", "father"]

for word in test_words:
    result = find_rhymes(word, "en", ["en"], sort_mode="balanced", limit=50)
    hyphen_near_top = [(i+1, r.word, r.combined_score) for i, r in enumerate(result["results"][:10]) if "-" in r.word]
    if hyphen_near_top:
        print(f"\n*** {word}: hyphen in top 10 ***")
        for pos, w, sc in hyphen_near_top:
            print(f"    #{pos} {w}  combined={sc:.5f}")
    # Also show top 3 for context
    top3 = [(i+1, r.word, r.combined_score) for i, r in enumerate(result["results"][:3])]
    print(f"{word}: top3 = {top3}")

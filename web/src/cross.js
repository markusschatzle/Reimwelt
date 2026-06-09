// ---------------------------------------------------------------------------
// Labels for the cross-language ("Kreuzsprache") pages.
// The page is written in the SOURCE language's voice: a de→en page is German
// ("Englische Reime auf das deutsche Wort …"), an en→de page is English
// ("German rhymes for the English word …").
// ---------------------------------------------------------------------------

// German adjective forms — used when the source (page) language is German.
const DE_ADJ = {
  de: "deutsche",
  en: "englische",
  fr: "französische",
  es: "spanische",
  it: "italienische",
  nl: "niederländische",
  pl: "polnische",
};

// English language names — used when the source (page) language is English.
const EN_NAME = {
  de: "German",
  en: "English",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
};

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Full H1 / <title>. `word` optional (omit for the langpair landing). */
export function crossTitle(src, tgt, word) {
  if (src === "de") {
    const obj = word ? `das deutsche Wort „${word}“` : "deutsche Wörter";
    return `${cap(DE_ADJ[tgt])} Reime auf ${obj}`;
  }
  const obj = word ? `the ${EN_NAME[src]} word “${word}”` : `${EN_NAME[src]} words`;
  return `${EN_NAME[tgt]} rhymes for ${obj}`;
}

export function crossDescription(src, tgt, word) {
  if (src === "de") {
    const obj = word ? `das deutsche Wort „${word}“` : "deutsche Wörter";
    return `Finde ${DE_ADJ[tgt]} Reime auf ${obj} – phonetisch sortiert.`;
  }
  const obj = word ? `the ${EN_NAME[src]} word “${word}”` : `${EN_NAME[src]} words`;
  return `Find ${EN_NAME[tgt]} rhymes for ${obj}, ranked phonetically.`;
}

/** Short label for inline links (e.g. on a word page). `word` required. */
export function crossShortLabel(src, tgt, word) {
  if (src === "de") return `${cap(DE_ADJ[tgt])} Reime auf „${word}“`;
  return `${EN_NAME[tgt]} rhymes for “${word}”`;
}

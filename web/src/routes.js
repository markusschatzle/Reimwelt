// ---------------------------------------------------------------------------
// Route map — single source of truth for localized URL segments.
// To add a language: add its locale here plus a segment in each map, and make
// sure the DB has words for that language. See README.md ("Adding a language").
// ---------------------------------------------------------------------------

export const LOCALES = ["de", "en"];
export const DEFAULT_LOCALE = "de";

// Rhyme/word tool segment per language: /de/reime, /en/rhymes …
export const ROUTE_SEGMENTS = {
  de: "reime",
  en: "rhymes",
  // fr: "rimes", es: "rimas", it: "rime", nl: "rijmen", pl: "rymy"  (reserved)
};

// Endings tool segment per language (interactive now; SEO pages in Phase 2).
export const ENDING_SEGMENTS = {
  de: "reimendung",
  en: "rhyme-ending",
};

export function isLocale(lang) {
  return LOCALES.includes(lang);
}

/** Classify a `[section]` URL segment for a given language. null → notFound. */
export function resolveSection(lang, section) {
  if (ROUTE_SEGMENTS[lang] === section) return { type: "rhymes" };
  if (ENDING_SEGMENTS[lang] === section) return { type: "endings" };
  return null;
}

export function rhymePath(lang, word) {
  const base = `/${lang}/${ROUTE_SEGMENTS[lang]}`;
  return word ? `${base}/${encodeURIComponent(word)}` : base;
}

export function endingPath(lang, ending) {
  const base = `/${lang}/${ENDING_SEGMENTS[lang]}`;
  return ending ? `${base}/${encodeURIComponent(ending)}` : base;
}

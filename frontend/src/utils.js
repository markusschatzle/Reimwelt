// ---------------------------------------------------------------------------
// Dedup helpers
// ---------------------------------------------------------------------------

/** Canonical key for deduplication: strip outer punctuation, lowercase, ß→ss */
export function canonicalKey(w) {
  return w
    .replace(/^[-. ]+|[-. ]+$/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss");
}

/**
 * Lower rank = more preferred representative within a canonical group.
 *   0 — uppercase, no ß, no hyphens/dots  (Fest, Masse)
 *   1 — lowercase, no ß, no hyphens/dots  (fest, lässt)
 *   2 — uppercase, has ß, no hyphens/dots (Straße — only loses if Strasse also present)
 *   3 — lowercase, has ß, no hyphens/dots (läßt — old spelling, always loses to lässt)
 *   4 — has hyphens or dots              (fest-)
 */
export function formRank(w) {
  const s = w.replace(/^[-. ]+|[-. ]+$/g, "");
  if (/[-.]/.test(s)) return 4;
  const upper = /^[A-ZÄÖÜ]/.test(s);
  const eszett = /ß/.test(s);
  if (upper && !eszett) return 0;
  if (!upper && !eszett) return 1;
  if (upper && eszett) return 2;
  return 3; // lowercase + ß = old-spelling candidate (läßt, muß, daß …)
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

// Mirror the backend's _freq_normalized: log10 scale → [0, 1]
export function freqNorm(f) {
  return (Math.log10(f + 1e-9) + 9) / 9;
}

/**
 * Mirror the backend's _word_form_penalty — applied to English and German results.
 * Returns a multiplier in (0, 1] to penalise non-standard word forms.
 */
export function wordFormPenalty(result) {
  const w = result.word;
  if (w.trimEnd().endsWith(".")) return 0.01; // abbreviations (erg., usw., …)
  if (/-/.test(w)) return 0.006; // hyphenated compounds: penalise for all languages
  if (result.language === "de") {
    const wl = w.toLowerCase();
    // Penalise ASCII umlaut substitutions: fuer→für, haette→hätte, koennen→können.
    // Only when no real umlaut is present; lookbehind excludes vowels and "q" so
    // "neue" (eu+e), "Aue" (au+e), "quer" (qu) etc. are not flagged.
    if (!/[äöüß]/.test(wl) && /(?<![aeiouäöüqAEIOUÄÖÜQ])(?:ue|ae|oe)/u.test(wl)) {
      return 0.05;
    }
    return 1.0;
  }
  if (result.language !== "en") return 1.0;
  if (/[^\w'\-]/u.test(w)) return 0.2; // special symbols (♯, &, …)
  if (w.startsWith("'")) return 0.3; // 'tis, 'twas
  if (/[a-z][A-Z]|[A-Z]{2,}/.test(w)) return 0.3; // GoEs, iPhone
  return 1.0;
}

export function sortResults(results, sortValue) {
  const parts = sortValue.split("_");
  const baseMode = parts[0];
  const dir = parts[1] || "desc"; // "balanced" has no suffix → always desc
  return [...results].sort((a, b) => {
    if (baseMode === "alpha") {
      const cmp = a.word.localeCompare(b.word);
      return dir === "asc" ? cmp : -cmp;
    }
    const fa = freqNorm(a.frequency_score);
    const fb = freqNorm(b.frequency_score);
    const pa = wordFormPenalty(a);
    const pb = wordFormPenalty(b);
    let sa, sb;
    if (baseMode === "purity") {
      sa = (0.85 * a.purity_score + 0.15 * fa) * pa;
      sb = (0.85 * b.purity_score + 0.15 * fb) * pb;
    } else if (baseMode === "usefulness") {
      sa = (0.15 * a.purity_score + 0.85 * fa) * pa;
      sb = (0.15 * b.purity_score + 0.85 * fb) * pb;
    } else {
      sa = (0.5 * a.purity_score + 0.5 * fa) * pa;
      sb = (0.5 * b.purity_score + 0.5 * fb) * pb;
    }
    return dir === "desc" ? sb - sa : sa - sb;
  });
}

// ---------------------------------------------------------------------------
// Dedup pass (used by both ReimePage and EndungenPage)
// ---------------------------------------------------------------------------

/**
 * Given a sorted results array, deduplicate by canonical word form.
 * Returns the preferred form for each canonical group, at the position
 * of the first occurrence (so score order is preserved).
 */
export function deduplicateResults(sorted) {
  // Pass 1 — find preferred representative per canonical group
  const bestForm = new Map();
  for (const r of sorted) {
    const key = canonicalKey(r.word);
    if (!bestForm.has(key)) {
      bestForm.set(key, r);
    } else if (formRank(r.word) < formRank(bestForm.get(key).word)) {
      bestForm.set(key, r);
    }
  }
  // Pass 2 — emit preferred form at position of first encounter
  const seen = new Set();
  return sorted.flatMap((r) => {
    const key = canonicalKey(r.word);
    if (seen.has(key)) return [];
    seen.add(key);
    return [bestForm.get(key)];
  });
}

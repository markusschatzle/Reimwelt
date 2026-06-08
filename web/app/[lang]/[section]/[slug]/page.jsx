import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  isLocale,
  resolveSection,
  ROUTE_SEGMENTS,
  rhymePath,
  endingPath,
} from "../../../../src/routes.js";
import { sortResults, deduplicateResults } from "../../../../src/utils.js";
import { POS_LABELS } from "../../../../src/constants.js";
import {
  serverFetchWordDetail,
  serverSearchRhymes,
  fetchTopWords,
} from "../../../../src/server-api.js";
import ReimePage from "../../../../src/views/ReimePage.jsx";
import EndungenPage from "../../../../src/views/EndungenPage.jsx";

// Prebuild only the highest-frequency rhyme-tool words; everything else is
// produced on first request and cached (ISR).
export const dynamicParams = true;
export const revalidate = 604800; // 1 week

// react cache() dedupes these between generateMetadata() and the page body.
const getDetail = cache((word, lang) => serverFetchWordDetail(word, lang));
const getRhymes = cache((word, lang) =>
  serverSearchRhymes({
    word,
    source_lang: lang,
    target_langs: [lang],
    sort_mode: "balanced",
    limit: 500,
  }),
);

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export async function generateStaticParams({ params }) {
  const lang = params?.lang;
  const section = params?.section;
  // Only the rhyme tool has prebuilt detail pages in Phase 1.
  if (!lang || ROUTE_SEGMENTS[lang] !== section) return [];
  const limit = parseInt(process.env.SSG_WORD_LIMIT || "1000", 10);
  try {
    const data = await fetchTopWords(lang, limit);
    return (data.words || []).map((w) => ({ slug: w }));
  } catch {
    // Backend unavailable at build time → prebuild nothing, let ISR fill in.
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { lang, section } = params;
  if (!isLocale(lang)) return {};
  const resolved = resolveSection(lang, section);
  if (!resolved) return {};
  const word = safeDecode(params.slug);

  if (resolved.type === "rhymes") {
    const detail = await getDetail(word, lang).catch(() => null);
    if (!detail) {
      return { title: word, robots: { index: false, follow: true } };
    }
    const title =
      lang === "en" ? `Rhymes for “${word}”` : `Reime auf „${word}“`;
    const firstDef = Array.isArray(detail.definitions)
      ? detail.definitions[0]
      : null;
    const description =
      lang === "en"
        ? `Phonetic rhymes for “${word}”. ${firstDef || ""}`.trim()
        : `Phonetisch passende Reime auf „${word}“. ${firstDef || ""}`.trim();
    return {
      title,
      description,
      alternates: { canonical: rhymePath(lang, word) },
      robots: { index: true, follow: true },
      openGraph: { title, description, type: "article" },
    };
  }

  // endings
  const title =
    lang === "en" ? `Words ending in “-${word}”` : `Wörter auf „-${word}“`;
  return {
    title,
    alternates: { canonical: endingPath(lang, word) },
    robots: { index: true, follow: true },
  };
}

export default async function DetailPage({ params }) {
  const { lang, section } = params;
  if (!isLocale(lang)) notFound();
  const resolved = resolveSection(lang, section);
  if (!resolved) notFound();
  const word = safeDecode(params.slug);

  // --- Endings detail (interactive fallback in Phase 1; full SEO in Phase 2) ---
  if (resolved.type === "endings") {
    return (
      <article className="word-page">
        <h1 className="seo-h1">
          {lang === "en"
            ? `Words ending in “-${word}”`
            : `Wörter auf „-${word}“`}
        </h1>
        <EndungenPage key={word} lang={lang} initialSuffix={word} />
      </article>
    );
  }

  // --- Rhyme word page: unified SSR ---
  const detail = await getDetail(word, lang);
  if (!detail) notFound();

  const rhymeData = await getRhymes(word, lang);
  const results = rhymeData.results || [];
  const ranked = deduplicateResults(sortResults(results, "balanced"));
  const topLinks = ranked.slice(0, 24);

  const definitions = Array.isArray(detail.definitions)
    ? detail.definitions.slice(0, 5)
    : [];
  const synonyms = (Array.isArray(detail.synonyms) ? detail.synonyms : [])
    .map((s) => (typeof s === "string" ? s : s.word || ""))
    .filter(Boolean)
    .slice(0, 12);

  const h1 = lang === "en" ? `Rhymes for “${word}”` : `Reime auf „${word}“`;
  const posLabel = detail.pos ? POS_LABELS[detail.pos] || detail.pos : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: word,
    inLanguage: lang,
    description: definitions[0] || h1,
    url: rhymePath(lang, word),
    ...(detail.ipa ? { alternateName: `[${detail.ipa}]` } : {}),
  };

  return (
    <article className="word-page">
      <header className="seo-head">
        <h1 className="seo-h1">{h1}</h1>
        {detail.ipa && <p className="seo-ipa">[{detail.ipa}]</p>}
      </header>

      {/* Interactive search island — server-rendered with seeded results, then
          hydrates. The search field is pre-filled and results match the SSR. */}
      <ReimePage
        key={word}
        lang={lang}
        initialWord={word}
        initialResults={results}
        initialQueryMeta={rhymeData.query}
        initialMeta={rhymeData.meta}
      />

      {/* Complementary SEO content: real HTML, crawlable internal links. */}
      <section className="seo-prose" aria-label={`Über ${word}`}>
        {(posLabel || detail.gender) && (
          <p className="seo-meta">
            {posLabel}
            {detail.gender ? ` · ${detail.gender}` : ""}
          </p>
        )}

        {definitions.length > 0 && (
          <div className="seo-block">
            <h2>{lang === "en" ? "Meaning" : "Bedeutung"}</h2>
            <dl className="seo-defs">
              {definitions.map((def, i) => (
                <div key={i} className="seo-def-row">
                  <dt>{i + 1}.</dt>
                  <dd>{def}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {topLinks.length > 0 && (
          <nav className="seo-block" aria-label="Verwandte Reime">
            <h2>
              {lang === "en"
                ? `Top rhymes for “${word}”`
                : `Top-Reime auf „${word}“`}
            </h2>
            <ul className="seo-link-list">
              {topLinks.map((r) => (
                <li key={`${r.word}-${r.language}`}>
                  <Link href={rhymePath(lang, r.word)}>{r.word}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {synonyms.length > 0 && (
          <nav className="seo-block" aria-label="Synonyme">
            <h2>{lang === "en" ? "Synonyms" : "Synonyme"}</h2>
            <ul className="seo-link-list">
              {synonyms.map((s) => (
                <li key={s}>
                  <Link href={rhymePath(lang, s)}>{s}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}

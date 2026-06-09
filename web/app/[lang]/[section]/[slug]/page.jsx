import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  isLocale,
  isSafeSlug,
  resolveSection,
  ROUTE_SEGMENTS,
  ENDING_SEGMENTS,
  rhymePath,
  endingPath,
  crossPath,
} from "../../../../src/routes.js";
import { crossShortLabel } from "../../../../src/cross.js";
import {
  sortResults,
  deduplicateResults,
  toWordList,
} from "../../../../src/utils.js";
import { breadcrumbList } from "../../../../src/seo.js";
import {
  serverFetchWordDetail,
  serverSearchRhymes,
  serverSearchEndings,
  fetchTopWords,
  fetchTopEndings,
} from "../../../../src/server-api.js";
import Breadcrumbs from "../../../../src/components/Breadcrumbs.jsx";
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
const getEndings = cache((suffix, lang) =>
  serverSearchEndings({ suffix, lang, anywhere: false, limit: 500 }),
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
  if (!lang) return [];

  // Rhyme word pages: prebuild the top-frequency words.
  if (ROUTE_SEGMENTS[lang] === section) {
    const limit = parseInt(process.env.SSG_WORD_LIMIT || "1000", 10);
    try {
      const data = await fetchTopWords(lang, limit);
      return (data.words || []).filter(isSafeSlug).map((w) => ({ slug: w }));
    } catch {
      return [];
    }
  }

  // Ending pages: prebuild the most common orthographic suffixes.
  if (ENDING_SEGMENTS[lang] === section) {
    const limit = parseInt(process.env.SSG_ENDING_LIMIT || "200", 10);
    try {
      const data = await fetchTopEndings(lang, limit);
      return (data.endings || []).filter(isSafeSlug).map((e) => ({ slug: e }));
    } catch {
      return [];
    }
  }

  // Backend unavailable at build time → prebuild nothing, let ISR fill in.
  return [];
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
  const description =
    lang === "en"
      ? `A list of words ending in “-${word}”, with rhymes and pronunciation.`
      : `Alle Wörter mit der Endung „-${word}“ – mit Reimen und Aussprache.`;
  return {
    title,
    description,
    alternates: { canonical: endingPath(lang, word) },
    robots: { index: true, follow: true },
    openGraph: { title, description, type: "article" },
  };
}

export default async function DetailPage({ params }) {
  const { lang, section } = params;
  if (!isLocale(lang)) notFound();
  const resolved = resolveSection(lang, section);
  if (!resolved) notFound();
  const word = safeDecode(params.slug);

  // --- Ending page: unified SSR (orthographic suffix) ---
  if (resolved.type === "endings") {
    const data = await getEndings(word, lang);
    const results = data.results || [];
    if (results.length === 0) notFound(); // don't index empty endings

    const ranked = deduplicateResults(sortResults(results, "balanced"));
    const linkWords = ranked.slice(0, 60);
    const total = data.meta?.total ?? results.length;
    const h1 =
      lang === "en" ? `Words ending in “-${word}”` : `Wörter auf „-${word}“`;

    const crumbs = [
      { name: "Reimwelt", href: rhymePath(lang) },
      {
        name: lang === "en" ? "Endings" : "Endungen",
        href: endingPath(lang),
      },
      { name: `-${word}`, href: endingPath(lang, word) },
    ];

    const jsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: h1,
        numberOfItems: linkWords.length,
        itemListElement: linkWords.map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: r.word,
          url: rhymePath(lang, r.word),
        })),
      },
      breadcrumbList(crumbs),
    ];

    return (
      <article className="word-page">
        <Breadcrumbs items={crumbs} />
        <header className="seo-head">
          <h1 className="seo-h1">{h1}</h1>
        </header>

        <EndungenPage
          key={word}
          lang={lang}
          initialSuffix={word}
          initialResults={results}
          initialMeta={data.meta}
          navigateOnSearch={endingPath(lang)}
        />

        <section className="seo-prose" aria-label={h1}>
          <p className="seo-meta">
            {lang === "en" ? `${total} words` : `${total} Wörter`}
          </p>
          <nav className="seo-block" aria-label={h1}>
            <h2>{h1}</h2>
            <ul className="seo-link-list">
              {linkWords.map((r) => (
                <li key={`${r.word}-${r.language}`}>
                  <Link href={rhymePath(lang, r.word)}>{r.word}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </article>
    );
  }

  // --- Rhyme word page: unified SSR ---
  const detail = await getDetail(word, lang);
  if (!detail) notFound();

  const rhymeData = await getRhymes(word, lang);
  const results = rhymeData.results || [];

  const firstDef = Array.isArray(detail.definitions)
    ? detail.definitions[0]
    : null;
  const synonyms = toWordList(detail.synonyms, 12);
  const antonyms = toWordList(detail.antonyms, 12);

  const h1 = lang === "en" ? `Rhymes for “${word}”` : `Reime auf „${word}“`;
  const otherLang = lang === "de" ? "en" : "de"; // for the cross-language link

  const crumbs = [
    { name: "Reimwelt", href: rhymePath(lang) },
    { name: word, href: rhymePath(lang, word) },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      name: word,
      inLanguage: lang,
      description: firstDef || h1,
      url: rhymePath(lang, word),
      ...(detail.ipa ? { alternateName: `[${detail.ipa}]` } : {}),
    },
    breadcrumbList(crumbs),
  ];

  return (
    <article className="word-page">
      <Breadcrumbs items={crumbs} />
      <header className="seo-head">
        <h1 className="seo-h1">{h1}</h1>
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
        initialRelated={{ synonyms, antonyms }}
        navigateOnSearch={rhymePath(lang)}
      />

      {/* Complementary SEO content. Synonyms/antonyms are shown by the island
          above (RelatedWords); here we keep only the cross-language link. */}
      <section className="seo-prose" aria-label={`Über ${word}`}>
        <p className="seo-cross-link">
          <Link href={crossPath(lang, otherLang, word)}>
            {crossShortLabel(lang, otherLang, word)} →
          </Link>
        </p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}

import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  parseLangpair,
  crossPath,
  rhymePath,
  isSafeSlug,
} from "../../../../src/routes.js";
import { crossTitle, crossDescription } from "../../../../src/cross.js";
import {
  sortResults,
  deduplicateResults,
  toWordList,
} from "../../../../src/utils.js";
import { breadcrumbList } from "../../../../src/seo.js";
import {
  serverFetchWordDetail,
  serverSearchRhymes,
  fetchTopWords,
} from "../../../../src/server-api.js";
import Breadcrumbs from "../../../../src/components/Breadcrumbs.jsx";
import ReimePage from "../../../../src/views/ReimePage.jsx";

export const dynamicParams = true;
export const revalidate = 604800; // 1 week

const getDetail = cache((word, lang) => serverFetchWordDetail(word, lang));
const getCross = cache((word, src, tgt) =>
  serverSearchRhymes({
    word,
    source_lang: src,
    target_langs: [tgt],
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
  const pair = parseLangpair(params?.langpair);
  if (!pair) return [];
  const limit = parseInt(process.env.SSG_CROSS_LIMIT || "300", 10);
  try {
    const data = await fetchTopWords(pair.src, limit);
    return (data.words || []).filter(isSafeSlug).map((w) => ({ slug: w }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const pair = parseLangpair(params.langpair);
  if (!pair) return {};
  const word = safeDecode(params.slug);
  const title = crossTitle(pair.src, pair.tgt, word);
  const detail = await getDetail(word, pair.src).catch(() => null);
  if (!detail) return { title, robots: { index: false, follow: true } };
  // No cross-language rhymes → still render the page (graceful empty state),
  // but keep it out of the index.
  const data = await getCross(word, pair.src, pair.tgt).catch(() => null);
  const hasResults = (data?.results || []).some((r) => r.language === pair.tgt);
  const description = crossDescription(pair.src, pair.tgt, word);
  return {
    title,
    description,
    alternates: { canonical: crossPath(pair.src, pair.tgt, word) },
    robots: { index: hasResults, follow: true },
    openGraph: { title, description, type: "article" },
  };
}

export default async function CrossWordPage({ params }) {
  const pair = parseLangpair(params.langpair);
  if (!pair) notFound();
  const word = safeDecode(params.slug);

  const detail = await getDetail(word, pair.src);
  if (!detail) notFound();

  const data = await getCross(word, pair.src, pair.tgt);
  // Keep only target-language rhymes (drops the source word if echoed back).
  const results = (data.results || []).filter((r) => r.language === pair.tgt);
  // No notFound() on empty — the search island below renders the normal
  // "Keine Reime gefunden" empty state (the page is noindex'd via metadata).
  const hasResults = results.length > 0;

  const ranked = deduplicateResults(sortResults(results, "balanced"));
  const linkWords = ranked.slice(0, 40);
  const h1 = crossTitle(pair.src, pair.tgt, word);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: h1,
    inLanguage: pair.tgt,
    numberOfItems: linkWords.length,
    itemListElement: linkWords.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.word,
      url: rhymePath(pair.tgt, r.word),
    })),
  };

  const crumbs = [
    { name: "Reimwelt", href: rhymePath(pair.src) },
    {
      name: pair.src === "de" ? "Kreuzsprache" : "Cross-language",
      href: crossPath(pair.src, pair.tgt),
    },
    { name: word, href: crossPath(pair.src, pair.tgt, word) },
  ];
  const jsonLd = hasResults
    ? [itemList, breadcrumbList(crumbs)]
    : [breadcrumbList(crumbs)];

  return (
    <article className="word-page">
      <Breadcrumbs items={crumbs} />
      <header className="seo-head">
        <h1 className="seo-h1">{h1}</h1>
      </header>

      <ReimePage
        key={`${pair.src}-${pair.tgt}-${word}`}
        lang={pair.src}
        sourceLang={pair.src}
        targetLang={pair.tgt}
        langLocked={false}
        initialWord={word}
        initialResults={results}
        initialQueryMeta={data.query}
        initialMeta={data.meta}
        initialRelated={{
          synonyms: toWordList(detail.synonyms, 12),
          antonyms: toWordList(detail.antonyms, 12),
        }}
      />

      {/* The target-language rhymes are already shown in the results above, so
          no visible list here; the ItemList JSON-LD below still enumerates them
          (with URLs) for crawlers. */}
      <section className="seo-prose" aria-label={h1}>
        <p className="seo-cross-link">
          <Link href={rhymePath(pair.src, word)}>
            {pair.src === "de"
              ? `Alle Reime auf „${word}“`
              : `All rhymes for “${word}”`}
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

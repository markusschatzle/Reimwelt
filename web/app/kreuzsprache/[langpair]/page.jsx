import { notFound } from "next/navigation";
import { LANG_PAIRS, parseLangpair, crossPath } from "../../../src/routes.js";
import { crossTitle, crossDescription } from "../../../src/cross.js";
import ReimePage from "../../../src/views/ReimePage.jsx";

export function generateStaticParams() {
  return LANG_PAIRS.map(([src, tgt]) => ({ langpair: `${src}-${tgt}` }));
}

export function generateMetadata({ params }) {
  const pair = parseLangpair(params.langpair);
  if (!pair) return {};
  const title = crossTitle(pair.src, pair.tgt);
  return {
    title,
    description: crossDescription(pair.src, pair.tgt),
    alternates: { canonical: crossPath(pair.src, pair.tgt) },
    robots: { index: true, follow: true },
  };
}

export default function CrossLanding({ params }) {
  const pair = parseLangpair(params.langpair);
  if (!pair) notFound();
  return (
    <article className="word-page">
      <header className="seo-head">
        <h1 className="seo-h1">{crossTitle(pair.src, pair.tgt)}</h1>
      </header>
      <ReimePage
        lang={pair.src}
        sourceLang={pair.src}
        targetLang={pair.tgt}
        langLocked={false}
      />
    </article>
  );
}

import Link from "next/link";
import { rhymePath } from "../routes.js";

// Internal-linking component: synonyms + antonyms of the searched word, each
// linking to that word's own rhyme page. Renders nothing when both are empty.
// `synonyms`/`antonyms` are plain string arrays; `lang` is the words' language.
export default function RelatedWords({ synonyms = [], antonyms = [], lang = "de" }) {
  const hasSyn = Array.isArray(synonyms) && synonyms.length > 0;
  const hasAnt = Array.isArray(antonyms) && antonyms.length > 0;
  if (!hasSyn && !hasAnt) return null;

  const L = (de, en) => (lang === "en" ? en : de);

  return (
    <section className="related-words" aria-label={L("Verwandte Wörter", "Related words")}>
      {hasSyn && (
        <div className="related-group">
          <h2 className="related-heading">{L("Synonyme", "Synonyms")}</h2>
          <ul className="related-list">
            {synonyms.map((w) => (
              <li key={`syn-${w}`}>
                <Link href={rhymePath(lang, w)}>{w}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasAnt && (
        <div className="related-group">
          <h2 className="related-heading">{L("Antonyme", "Antonyms")}</h2>
          <ul className="related-list">
            {antonyms.map((w) => (
              <li key={`ant-${w}`}>
                <Link href={rhymePath(lang, w)}>{w}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

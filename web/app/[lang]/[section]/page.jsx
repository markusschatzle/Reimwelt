import { notFound } from "next/navigation";
import {
  isLocale,
  resolveSection,
  ROUTE_SEGMENTS,
  ENDING_SEGMENTS,
  LOCALES,
} from "../../../src/routes.js";
import ReimePage from "../../../src/views/ReimePage.jsx";
import EndungenPage from "../../../src/views/EndungenPage.jsx";

// Prebuild the two tool landings (rhymes + endings) for each language.
export function generateStaticParams({ params }) {
  const lang = params?.lang;
  if (!lang || !ROUTE_SEGMENTS[lang]) return [];
  return [{ section: ROUTE_SEGMENTS[lang] }, { section: ENDING_SEGMENTS[lang] }];
}

const COPY = {
  rhymes: {
    de: {
      title: "Reime finden",
      description:
        "Gib ein Wort ein und finde phonetisch passende Reime – mit Lautschrift, Metrum und Häufigkeit.",
    },
    en: {
      title: "Find rhymes",
      description:
        "Enter a word and find phonetically matching rhymes – with IPA, meter and frequency.",
    },
  },
  endings: {
    de: {
      title: "Wörter nach Endung",
      description: "Finde alle Wörter mit einer bestimmten Endung.",
    },
    en: {
      title: "Words by ending",
      description: "Find all words sharing a given ending.",
    },
  },
};

export function generateMetadata({ params }) {
  const { lang, section } = params;
  const resolved = isLocale(lang) ? resolveSection(lang, section) : null;
  if (!resolved) return {};
  const copy = COPY[resolved.type][lang] || COPY[resolved.type].de;

  // hreflang alternates make sense for the tool landings (same content, two
  // languages), unlike word pages which are language-specific.
  const languages = {};
  for (const l of LOCALES) {
    const seg =
      resolved.type === "rhymes" ? ROUTE_SEGMENTS[l] : ENDING_SEGMENTS[l];
    if (seg) languages[l] = `/${l}/${seg}`;
  }

  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: `/${lang}/${section}`, languages },
    robots: { index: true, follow: true },
  };
}

export default function SectionPage({ params }) {
  const { lang, section } = params;
  if (!isLocale(lang)) notFound();
  const resolved = resolveSection(lang, section);
  if (!resolved) notFound();

  if (resolved.type === "rhymes") return <ReimePage lang={lang} />;
  return <EndungenPage lang={lang} />;
}

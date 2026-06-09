import {
  LOCALES,
  ROUTE_SEGMENTS,
  ENDING_SEGMENTS,
  rhymePath,
  endingPath,
} from "../src/routes.js";
import { fetchTopWords, fetchTopEndings } from "../src/server-api.js";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://reimwelt.de";

const STATIC_PATHS = [
  "wissenswelt",
  "wissenswelt/reimen",
  "wissenswelt/homographe",
  "wissenswelt/metrum",
  "wissenswelt/ipa",
  "impressum",
  "datenschutz",
];

// Phase 1 sitemap: tool landings, static pages, and the prebuilt head of word
// pages per language. (Ending + cross-language URLs are added in later phases.)
export default async function sitemap() {
  const entries = [];

  for (const lang of LOCALES) {
    entries.push({
      url: `${SITE}/${lang}/${ROUTE_SEGMENTS[lang]}`,
      changeFrequency: "weekly",
      priority: 1.0,
    });
    entries.push({
      url: `${SITE}/${lang}/${ENDING_SEGMENTS[lang]}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
    for (const p of STATIC_PATHS) {
      entries.push({
        url: `${SITE}/${lang}/${p}`,
        changeFrequency: "monthly",
        priority: 0.4,
      });
    }

    const wordLimit = parseInt(
      process.env.SITEMAP_WORD_LIMIT || process.env.SSG_WORD_LIMIT || "1000",
      10,
    );
    try {
      const data = await fetchTopWords(lang, wordLimit);
      for (const w of data.words || []) {
        entries.push({
          url: `${SITE}${rhymePath(lang, w)}`,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    } catch {
      // Backend unavailable — emit the landings/static pages only.
    }

    const endingLimit = parseInt(
      process.env.SITEMAP_ENDING_LIMIT || process.env.SSG_ENDING_LIMIT || "200",
      10,
    );
    try {
      const data = await fetchTopEndings(lang, endingLimit);
      for (const e of data.endings || []) {
        entries.push({
          url: `${SITE}${endingPath(lang, e)}`,
          changeFrequency: "weekly",
          priority: 0.5,
        });
      }
    } catch {
      // Backend unavailable — skip ending URLs.
    }
  }

  return entries;
}

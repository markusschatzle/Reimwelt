import {
  LOCALES,
  ROUTE_SEGMENTS,
  ENDING_SEGMENTS,
  DEFAULT_LOCALE,
} from "./routes.js";

/**
 * Translate a legacy non-localized path (e.g. "/reime", "/wissenswelt/ipa")
 * into the localized equivalent for `lang` (e.g. "/de/reime", "/de/wissenswelt/ipa").
 * Already-localized paths and external/hash links are returned unchanged.
 */
export function localizeHref(lang, to) {
  const L = lang || DEFAULT_LOCALE;
  if (typeof to !== "string" || !to.startsWith("/")) return to;

  const [path, hash] = to.split("#");
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return `/${L}/${ROUTE_SEGMENTS[L]}`;
  if (LOCALES.includes(parts[0])) return to; // already localized

  let first = parts[0];
  if (first === "reime") first = ROUTE_SEGMENTS[L];
  else if (first === "endungen") first = ENDING_SEGMENTS[L];
  // "wissenswelt", "impressum", "datenschutz" keep their segment.

  const out = "/" + [L, first, ...parts.slice(1)].join("/");
  return hash ? `${out}#${hash}` : out;
}

// ---------------------------------------------------------------------------
// Server-side data fetching for SSR / SSG / ISR. Used ONLY from server
// components and generateStaticParams — never imported into client code.
// Reaches FastAPI directly over INTERNAL_API_URL and caches weekly.
// ---------------------------------------------------------------------------

const BASE = process.env.INTERNAL_API_URL || "http://127.0.0.1:8000";
const REVALIDATE = 604800; // 1 week

export async function serverFetchWordDetail(word, lang) {
  const res = await fetch(
    `${BASE}/api/word/${encodeURIComponent(word)}?lang=${encodeURIComponent(lang)}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`word detail HTTP ${res.status}`);
  return res.json();
}

export async function serverSearchRhymes(params) {
  const res = await fetch(`${BASE}/api/rhymes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new Error(`rhymes HTTP ${res.status}`);
  return res.json();
}

export async function fetchTopWords(lang, limit) {
  const res = await fetch(
    `${BASE}/api/top-words/${encodeURIComponent(lang)}?limit=${limit}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) throw new Error(`top-words HTTP ${res.status}`);
  return res.json();
}

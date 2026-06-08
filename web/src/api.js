// Client-side calls go to relative /api/*, proxied to FastAPI by next.config.js
// rewrites (dev) / nginx (prod). Server-side code uses src/server-api.js instead.
const API_BASE = "";

export async function searchRhymes(params) {
  const res = await fetch(`${API_BASE}/api/rhymes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function searchEndings(params) {
  const res = await fetch(`${API_BASE}/api/endings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchWordDetail(word, lang) {
  const res = await fetch(
    `${API_BASE}/api/word/${encodeURIComponent(word)}?lang=${encodeURIComponent(lang)}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

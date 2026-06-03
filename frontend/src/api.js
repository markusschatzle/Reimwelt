const API_BASE = import.meta.env.VITE_API_URL || "";

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

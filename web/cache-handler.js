/**
 * In-memory, size-bounded ISR cache for `next start`.
 *
 * Next's default handler writes every on-demand page (HTML + RSC + fetch data)
 * to .next/ and never evicts. With dynamicParams over the whole lexicon,
 * crawlers filled the VPS disk (48 GB in .next/server → ENOSPC → 504s).
 *
 * This handler keeps entries in an LRU Map capped at ISR_CACHE_MB (default
 * 512) and never touches disk. Trade-off: the cache is empty after a restart,
 * so pages re-render on their first hit (≈1 s). Revalidation timing is still
 * handled by Next from `lastModified`.
 */
const MAX_BYTES = (Number(process.env.ISR_CACHE_MB) || 512) * 1024 * 1024;

/** Rough byte size of a cache value: strings + buffers, walked recursively. */
function sizeOf(value, depth = 0) {
  if (value == null || depth > 8) return 0;
  if (typeof value === "string") return value.length;
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) return value.byteLength;
  if (typeof value !== "object") return 8;
  let total = 0;
  if (value instanceof Map) {
    for (const [k, v] of value) total += sizeOf(k, depth + 1) + sizeOf(v, depth + 1);
    return total;
  }
  for (const k in value) total += k.length + sizeOf(value[k], depth + 1);
  return total;
}

const store = new Map(); // key -> { value, lastModified, tags, size }
let usedBytes = 0;

function remove(key) {
  const entry = store.get(key);
  if (!entry) return;
  usedBytes -= entry.size;
  store.delete(key);
}

module.exports = class MemoryCacheHandler {
  constructor(options) {
    this.options = options;
  }

  async get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    // Refresh recency: Map preserves insertion order, oldest first.
    store.delete(key);
    store.set(key, entry);
    return { value: entry.value, lastModified: entry.lastModified };
  }

  async set(key, data, ctx) {
    remove(key);
    if (data == null) return;
    const size = sizeOf(data) + key.length;
    if (size > MAX_BYTES / 10) return; // never let one entry dominate the cache
    const tags = (ctx && ctx.tags) || [];
    store.set(key, { value: data, lastModified: Date.now(), tags, size });
    usedBytes += size;
    for (const oldest of store.keys()) {
      if (usedBytes <= MAX_BYTES) break;
      remove(oldest);
    }
  }

  async revalidateTag(tags) {
    const list = [].concat(tags || []);
    for (const [key, entry] of store) {
      if (entry.tags.some((t) => list.includes(t))) remove(key);
    }
  }
};

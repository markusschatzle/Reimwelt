# Reimwelt — Next.js frontend (programmatic SEO)

This is the Next.js (App Router) frontend for Reimwelt. It serves the interactive
rhyme tool **and** server-rendered, indexable pages for individual words, so the
long tail of "Reime auf *X*" / "rhymes for *X*" queries can rank in search.

It talks to the existing FastAPI backend (`../api.py`) over HTTP. The old Vite SPA
in `../frontend` is kept runnable until cutover; this app supersedes it.

> **Status.** Phase 1 (migration + **word pages**), Phase 2 (**ending pages**)
> and Phase 3 (**cross-language pages**) are implemented. The wider schema /
> internal-linking program is a later phase (see `../CLAUDE.md` and the plan).

---

## Quick start

```bash
# 1. Backend (separate terminal, from repo root)
uvicorn api:app --reload --port 8000

# 2. Frontend
cd web
cp .env.local.example .env.local      # adjust if needed
npm install
npm run dev                            # http://localhost:5173
```

`/api/*` is proxied to the backend by `next.config.js` (dev) so client code calls
relative `/api` URLs unchanged. Server components reach the backend directly via
`INTERNAL_API_URL`.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Production build (prebuilds top `SSG_WORD_LIMIT` words/lang, default 1000) |
| `npm run build:priority` | Fast deploy build — top **1 000** words/lang, ISR handles the rest |
| `npm run build:full` | Top **10 000** words/lang (slower, more RAM) |
| `npm run start` | Production server on :3000 (`next start`) |

### Environment (`.env.local`)

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata / sitemap / robots |
| `INTERNAL_API_URL` | Where the Next **server** reaches FastAPI (default `http://127.0.0.1:8000`) |
| `SSG_WORD_LIMIT` | Words per language prebuilt at `next build` (rest via ISR) |
| `SITEMAP_WORD_LIMIT` | Words per language listed in `sitemap.xml` (defaults to `SSG_WORD_LIMIT`) |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_ADS_ID` | Optional Google tags (client) |

---

## URL structure

Everything is localized under a `[lang]` prefix. `/` redirects to `/de/reime`.
URL segments are **language-specific** (see `src/routes.js`):

| Pattern | Example | Page |
| --- | --- | --- |
| `/[lang]/[section]` | `/de/reime`, `/en/rhymes` | Interactive rhyme tool (landing) |
| `/[lang]/[section]` | `/de/reimendung`, `/en/rhyme-ending` | Interactive endings tool |
| `/[lang]/[section]/[slug]` | `/de/reime/Armut`, `/en/rhymes/love` | **Word page** — unified SSR |
| `/[lang]/[section]/[slug]` | `/de/reimendung/heit` | **Ending page** — unified SSR (orthographic suffix) |
| `/kreuzsprache/[langpair]` | `/kreuzsprache/de-en` | Cross-language tool (landing) |
| `/kreuzsprache/[langpair]/[slug]` | `/kreuzsprache/de-en/Armut` | **Cross-language page** — target-language rhymes for a source word |
| `/[lang]/wissenswelt[/…]` | `/de/wissenswelt/ipa` | Knowledge-base articles |
| `/[lang]/impressum`, `/[lang]/datenschutz` | | Legal pages |
| `/sitemap.xml`, `/robots.txt` | | Generated |

The `kreuzsprache` section is **not** locale-prefixed; the `[langpair]`
(`de-en`, `en-de`) encodes source→target. The page is written in the source
language's voice and reuses `/api/rhymes` with `source_lang`/`target_langs` (no
new backend endpoint); `generateStaticParams`/sitemap use top source words.

`[section]` is a dynamic segment validated by `resolveSection(lang, section)`;
unknown sections / languages → `notFound()`.

### The word page (unified SSR)

`app/[lang]/[section]/[slug]/page.jsx` is the only async **server** component. For
the rhyme tool it:

1. fetches the word's detail + rhymes server-side (`src/server-api.js`, cached
   weekly); a 404 from the backend → `notFound()`;
2. renders real HTML: an `<h1>`, the interactive search island **seeded with the
   word and its results** (server-rendered, then hydrated — search field
   pre-filled, no refetch flash), a definition `<dl>`, and `<nav>` lists of
   crawlable internal links (top rhymes + synonyms);
3. emits `DefinedTerm` JSON-LD and per-word metadata (title, canonical, OpenGraph,
   `robots: index,follow`).

Everything renders with JavaScript disabled. The interactive UI (filters, sort,
detail panel, theme, copy) hydrates on top.

### Static generation + ISR

`[slug]/page.jsx` sets `dynamicParams = true` and `revalidate = 604800` (weekly).
`generateStaticParams` prebuilds, per language, the top `SSG_WORD_LIMIT` words
(from `GET /api/top-words/{lang}`) for the rhyme tool and the top
`SSG_ENDING_LIMIT` endings (from `GET /api/top-endings/{lang}`) for the endings
tool; every other word/ending is generated on first request and then cached. If
the backend is down at build time, nothing is prebuilt and ISR fills everything
in on demand.

**Ending pages** (`/de/reimendung/heit`) work the same way as word pages but
match an **orthographic** word-final suffix (`POST /api/endings`): server-rendered
word list with crawlable links to each word's rhyme page, `ItemList` JSON-LD, the
seeded interactive endings island, and per-page metadata. Empty endings 404.

---

## Architecture

```
web/
  app/                         # App Router (routes only — thin wrappers)
    layout.jsx                 # <html>, global CSS, no-FOUC theme script, ThemeProvider
    page.jsx                   # / → redirect to /de/reime
    not-found.jsx              # 404 (noindex)
    sitemap.js, robots.js
    [lang]/
      layout.jsx               # validates lang, LangProvider + AppShell
      [section]/page.jsx       # tool landing (rhymes | endings)
      [section]/[slug]/page.jsx# unified SSR word page  ← the SEO core
      wissenswelt/**/page.jsx  # article wrappers
      impressum, datenschutz
  src/                         # all app code (ported from ../frontend/src)
    views/                     # page bodies (ReimePage = the search island, etc.)
    components/                # UI components ("use client")
    routes.js                  # LOCALES + segment maps + resolvers  ← edit to add a language
    links.js                   # localizeHref() — legacy path → localized
    lang.jsx                   # LangProvider / useLang()
    router.jsx                 # <Link>/<NavLink> shim over next/link (locale-prefixed)
    api.js                     # client fetches (relative /api)
    server-api.js              # server fetches (INTERNAL_API_URL, cached)
    utils.js, constants.js     # shared pure logic (sort/dedup), labels
  public/icons/                # SVGs
```

**Client vs server.** Ported pages/components are `"use client"` — but Next still
server-renders them to full HTML, so they remain crawlable. Only the word page is
a true async server component (it fetches data). No SEO page fetches data in
`useEffect`.

**Links.** Components keep their old `<Link to="/reime">` API via `src/router.jsx`,
which prefixes the current locale (`/de/reime`) using `useLang()`. Server
components build hrefs with `rhymePath(lang, word)` from `src/routes.js`.

---

## Adding a language

1. In `src/routes.js`: add the locale to `LOCALES`, and add its segment to
   `ROUTE_SEGMENTS` and `ENDING_SEGMENTS` (e.g. `fr: "rimes"` / `fr: "rime-fin"`).
2. Ensure the database has words for that language (`frequency_score`, `pos`, …).
3. Add labels/translations in `src/constants.js` as needed; static pages
   (`wissenswelt`, legal) are German-only for now — add localized bodies when ready.
4. `localizeHref`, the sitemap, and `generateStaticParams` pick the new locale up
   automatically.

---

## Deployment (netcup VPS)

Two processes behind nginx:

- FastAPI: `uvicorn api:app --port 8000`
- Next: `npm run build` then `npm run start` (port 3000)

nginx routes `/api/` → `127.0.0.1:8000` and everything else → `127.0.0.1:3000`
(or rely on the built-in Next `/api` rewrite). The ISR cache lives on disk in
`.next`, so it persists across requests. Run both under systemd/pm2.

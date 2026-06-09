# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Reimmaschine v3** is a multilingual rhyme-search engine. Users enter a German (or other language) word and get back phonetically-ranked rhymes. The backend uses PostgreSQL + IPA phoneme feature vectors; the frontend is Next.js (App Router) and adds server-rendered, SEO-indexable pages per word, ending, and language-pair.

## Development Commands

### Backend
```powershell
# Activate virtual environment
.venv\Scripts\activate

# Start API server (port 8000)
uvicorn api:app --reload --port 8000

# CLI search (useful for quick testing without the UI)
python cli.py rhymes "Zeit" --source de --target de --sort balanced
python cli.py rhymes "Haus" --source de --target de,en

# ETL: import/re-import linguistic data
python etl.py --input data/raw-wiktextract-data.jsonl.gz --db $env:DATABASE_URL --languages de en fr
```

### Frontend (Next.js — see [web/README.md](web/README.md))
```powershell
cd web
npm install
npm run dev      # Dev server → http://localhost:5173 (proxies /api to :8000)
npm run build    # Production build (prebuilds top-N SEO pages; rest via ISR)
npm run start    # Production server → http://localhost:3000
```

### Full stack: start backend in one terminal, frontend in another.

### PowerShell launcher (sets UTF-8 console encoding):
```powershell
.\reimmaschine.ps1
```

## Architecture

### Backend (`/`)
- **[api.py](api.py)** — FastAPI app. Three routes: `POST /api/rhymes`, `GET /api/word/{word}`, `POST /api/endings`. Lazy-imports `rhyme_engine` on first request.
- **[rhyme_engine.py](rhyme_engine.py)** — Core logic. Maintains a `ThreadedConnectionPool` (1–10 connections). `find_rhymes()` looks up the input word's IPA, extracts the rhyme part, queries DB for phonetically similar words, scores them via `PHONEME_FEATURES` articulatory distance, deduplicates, and sorts.
- **[phonetics.py](phonetics.py)** — IPA utilities: `extract_rhyme_part()`, `extract_stress_pattern()`, `classify_meter()`, optional eSpeak-ng wrapper (`call_espeak()`) for stress recovery in German/English. eSpeak is an optional system dependency.
- **[etl.py](etl.py)** — One-time/refresh import: reads gzipped Kaikki/Wiktextract JSONL, calls phonetics module, scores frequency via `wordfreq`, batch-inserts to PostgreSQL.
- **[cli.py](cli.py)** — Rich terminal UI for rhyme search (wraps `rhyme_engine` directly).
- **[scripts/](scripts/)** — one-time data-pipeline helpers (`fix_*`, `migrate_*`, `backfill_*`) already applied to the DB; not part of the running application.

### Frontend (`web/` — Next.js App Router)
The interactive rhyme tool plus programmatic-SEO pages (word, ending, and cross-language). Full structure, URL patterns, and "how to add a language" live in **[web/README.md](web/README.md)**. Key bits:
- **`web/src/views/`** — page bodies: `ReimePage.jsx` (the search island, reused by the landing and the SSR word/cross pages), `EndungenPage.jsx`, `wissenswelt/`.
- **`web/src/components/`** — UI components (`"use client"`): `SearchBar`, `FilterBar`, `WordChip`, `WordDetailPanel`, `RelatedWords`, `Breadcrumbs`, `Header`, `Footer`, …
- **`web/src/api.js`** (client `fetch`) vs **`web/src/server-api.js`** (server-side SSR/SSG/ISR fetching).
- **`web/src/{utils,constants,routes}.js`** — shared ranking/dedup (`sortResults`, `deduplicateResults`, `wordFormPenalty`, `freqNorm`), labels, and the localized route map (edit `routes.js` to add a language).
- **`web/src/ThemeContext.jsx`** — dark/light theme, persisted to `localStorage`. No Redux; local `useState` + Context.

### Database
PostgreSQL. The `words` table has columns: `word`, `language`, `ipa`, `ipa_raw`, `rhyme_part`, `stress_pattern`, `meter`, `syllable_count`, `pos`, `gender`, `frequency_score`, `definitions` (JSONB), `synonyms` (JSONB), `inflections` (JSONB), and boolean flags (`is_inflected_form`, `is_multiword`, `is_abbreviation`, `is_ghost_word`). All SQL in `rhyme_engine.py` uses parameterised queries.

### Environment
```
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/rhymes
ESPEAK_TIMEOUT=5        # optional
ESPEAK_CACHE_SIZE=50000 # optional
DEFAULT_LIMIT=50        # optional
DEFAULT_SORT_MODE=balanced # optional
```

## Key Design Decisions

- **Rhyme matching is phoneme-distance based**, not string-suffix based. `PHONEME_FEATURES` in `rhyme_engine.py` encodes articulatory features (manner, place, voicing) for every IPA symbol. This enables cross-language rhymes (e.g., German ↔ English).
- **Scoring uses two modes:** "purity" (85% phoneme quality + 15% frequency) vs "usefulness" (15% + 85%). `sortMode` is passed through from the frontend filter.
- **Deduplication runs on the frontend** in `web/src/utils.js`—`deduplicateResults()` keeps one canonical form per lemma (prefers uppercase initials, avoids ß forms). The backend returns all variants.
- **eSpeak is optional.** If not installed, stress and meter fields may be null; the UI handles this gracefully.
- **API proxy** — `web/next.config.js` rewrites `/api/*` → the FastAPI backend (`INTERNAL_API_URL`, default `http://127.0.0.1:8000`) in dev and prod, so client code uses relative `/api` URLs. Server components fetch the backend directly for SSR/SSG/ISR.

## Product Principles (from PRODUCT.md)

- Content is the UI — the word list is the product, chrome must recede.
- One action at a time: search → results → detail panel.
- Restrained accent color; readable contrast (WCAG 2.1 AA minimum, 4.5:1).
- Animations confirm state changes only — no decorative motion.
- Respect `prefers-reduced-motion`.

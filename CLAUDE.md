# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Reimmaschine v3** is a multilingual rhyme-search engine. Users enter a German (or other language) word and get back phonetically-ranked rhymes. The backend uses PostgreSQL + IPA phoneme feature vectors; the frontend is React + Vite.

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

### Frontend
```powershell
cd frontend
npm install
npm run dev      # Dev server → http://localhost:5173 (proxies /api to :8000)
npm run build    # Production build → frontend/dist/
npm run preview  # Preview production build
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
- **Utility scripts** (`fix_*.py`, `migrate_*.py`, `backfill_*.py`, `_debug_*.py`) — data-quality and schema-migration helpers, not part of the main application.

### Frontend (`frontend/src/`)
- **[App.jsx](frontend/src/App.jsx)** — Root: React Router, spotlight mouse-tracking effect (CSS variables), `ThemeContext` provider.
- **[api.js](frontend/src/api.js)** — All `fetch` calls to the backend. Single source of truth for request shapes.
- **[utils.js](frontend/src/utils.js)** — `sortResults()`, `deduplicateResults()`, `wordFormPenalty()`, `freqNorm()`. Ranking and dedup logic runs entirely in the browser on the response payload.
- **[constants.js](frontend/src/constants.js)** — Language groups, labels, sort modes. Edit here when adding a language.
- **Pages:** `ReimePage.jsx` (main search), `EndungenPage.jsx` (search by phonetic ending), `wissenswelt/` (knowledge base articles on IPA, meter, rhyme).
- **Components:** `SearchBar`, `FilterBar`, `WordChip`, `WordDetailPanel`, `LangDropdown`, `SkeletonGrid`, `ResultsMeta`, `EmptyState`, `Header`, `Footer`, `ThemeToggle`.
- **[ThemeContext.jsx](frontend/src/ThemeContext.jsx)** — Global dark/light theme, persisted to `localStorage`. No Redux; all state is local `useState` + Context.

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
- **Deduplication runs on the frontend** in `utils.js`—`deduplicateResults()` keeps one canonical form per lemma (prefers uppercase initials, avoids ß forms). The backend returns all variants.
- **eSpeak is optional.** If not installed, stress and meter fields may be null; the UI handles this gracefully.
- **Vite dev proxy** (`vite.config.js`) rewrites `/api` → `http://localhost:8000`, so the frontend never needs to know the backend URL in development.

## Product Principles (from PRODUCT.md)

- Content is the UI — the word list is the product, chrome must recede.
- One action at a time: search → results → detail panel.
- Restrained accent color; readable contrast (WCAG 2.1 AA minimum, 4.5:1).
- Animations confirm state changes only — no decorative motion.
- Respect `prefers-reduced-motion`.

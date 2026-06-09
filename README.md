# Reimmaschine v3 / Reimwelt

A multilingual rhyme-search engine. Enter a German (or English) word and get back
phonetically-ranked rhymes, with IPA, meter, and word frequency. Rhyme matching is
phoneme-distance based (articulatory feature vectors), which also enables
cross-language rhymes.

The site is both an **interactive tool** and a set of **server-rendered,
SEO-indexable pages** (one per word, per ending, and per language-pair).

## Repo layout

```
api.py            FastAPI server  — POST /api/rhymes, GET /api/word/{w},
                                     POST /api/endings, GET /api/top-words|top-endings
rhyme_engine.py   core matching/scoring (PHONEME_FEATURES, find_rhymes)
phonetics.py      IPA utilities (rhyme part, stress, meter; optional eSpeak)
etl.py            import from Kaikki/Wiktextract → PostgreSQL
cli.py            terminal rhyme search
web/              Next.js (App Router) frontend  → see web/README.md
scripts/          one-time data-pipeline helpers (already applied to the DB)
data/             raw wiktextract dump (gitignored, local)
deploy/           systemd units + nginx config + DEPLOY.md (VPS)
CLAUDE.md         architecture notes for Claude Code
PRODUCT.md        product principles
```

## Quick start (development)

```powershell
# 1. Backend (port 8000)
.venv\Scripts\activate
uvicorn api:app --reload --port 8000

# 2. Frontend (port 5173, proxies /api → :8000)
cd web
npm install
npm run dev
```

Requires a PostgreSQL `rhymes` database; set `DATABASE_URL` in `.env`. Restore the
database from the dump with `pg_restore` (see [deploy/DEPLOY.md](deploy/DEPLOY.md)).

CLI (no UI needed):

```powershell
python cli.py rhymes "Zeit" --source de --target de --sort balanced
```

## Production

Self-hosted on a VPS: FastAPI + Next.js behind nginx, managed by systemd. See
**[deploy/DEPLOY.md](deploy/DEPLOY.md)**.

## More docs

- **[web/README.md](web/README.md)** — frontend structure, URL patterns, SEO
  pages, and how to add a language.
- **[CLAUDE.md](CLAUDE.md)** — architecture and key design decisions.
- **[PRODUCT.md](PRODUCT.md)** — product principles.

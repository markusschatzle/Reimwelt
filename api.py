"""
api.py — FastAPI REST server for Reimwelt.

Endpoints:
  POST /api/rhymes       — find rhymes via rhyme_engine.find_rhymes()
  GET  /api/word/{word}  — full word detail from the DB

Run:
  uvicorn api:app --reload --port 8000

Environment (same as rhyme_engine, sourced from .env):
  DATABASE_URL      — psycopg2 connection string (required)
  ALLOWED_ORIGINS   — comma-separated CORS origins (default "*" for dev)
"""

from __future__ import annotations

import dataclasses
import json
import os
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

load_dotenv()

# ---------------------------------------------------------------------------
# App + CORS
# ---------------------------------------------------------------------------

app = FastAPI(title="Reimwelt API", version="1.0.0")

_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
_origins: list[str] = (
    ["*"] if _raw_origins.strip() == "*"
    else [o.strip() for o in _raw_origins.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ---------------------------------------------------------------------------
# Lazy DB connection for word-detail queries (single connection, not pooled)
# We deliberately do NOT share the rhyme_engine pool here so that api.py
# can be imported independently for testing.
# ---------------------------------------------------------------------------

DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

def _word_detail_conn() -> psycopg2.extensions.connection:
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Create a .env file or export it before starting the server."
        )
    return psycopg2.connect(DATABASE_URL)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class RhymeRequest(BaseModel):
    word: str = Field(..., min_length=1, max_length=200)
    source_lang: str = Field(..., min_length=2, max_length=10)
    target_langs: list[str] = Field(..., min_length=1)
    sort_mode: str = Field("balanced", pattern="^(purity|usefulness|balanced)$")
    meter: str | None = Field(None)
    stress_pattern: str | None = Field(None)
    syllable_count: int | None = Field(None, ge=1, le=20)
    limit: int = Field(50, ge=1)


class EndingsRequest(BaseModel):
    suffix: str = Field(..., min_length=1, max_length=100)
    lang: str = Field("de", min_length=2, max_length=10)
    anywhere: bool = False
    pos: str | None = Field(None)
    meter: str | None = Field(None)
    syllable_count: int | None = Field(None, ge=1, le=20)
    limit: int = Field(200, ge=1, le=1000)


# ---------------------------------------------------------------------------
# Helper — ensure RhymeResult dataclasses are JSON-serialisable
# ---------------------------------------------------------------------------

def _serialise_result(r: Any) -> dict[str, Any]:
    if dataclasses.is_dataclass(r) and not isinstance(r, type):
        return dataclasses.asdict(r)
    if isinstance(r, dict):
        return r
    return dict(r)


# ---------------------------------------------------------------------------
# POST /api/rhymes
# ---------------------------------------------------------------------------

@app.post("/api/rhymes")
async def post_rhymes(req: RhymeRequest) -> dict[str, Any]:
    # Import here so DATABASE_URL is fully loaded before rhyme_engine
    # initialises its connection pool.
    from rhyme_engine import find_rhymes  # noqa: PLC0415

    try:
        raw = find_rhymes(
            word=req.word,
            source_lang=req.source_lang,
            target_langs=req.target_langs,
            sort_mode=req.sort_mode,
            meter=req.meter,
            stress_pattern=req.stress_pattern,
            syllable_count=req.syllable_count,
            limit=req.limit,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Search failed: {exc}") from exc

    return {
        "query": raw["query"],
        "results": [_serialise_result(r) for r in raw["results"]],
        "meta": raw["meta"],
    }


# ---------------------------------------------------------------------------
# GET /api/word/{word}
# ---------------------------------------------------------------------------

_WORD_DETAIL_SQL = """
SELECT
    id, word, language, ipa_raw, ipa, ipa_source,
    rhyme_part, stress_pattern, meter, syllable_count,
    pos, gender, definitions, etymology,
    synonyms, antonyms, inflections, hyphenation, audio_url,
    frequency_score, is_inflected_form, is_multiword,
    is_abbreviation, is_ghost_word, raw_kaikki
FROM words
WHERE word = %(word)s AND language = %(lang)s
ORDER BY frequency_score DESC
LIMIT 1
"""

@app.get("/api/word/{word}")
async def get_word(word: str, lang: str = Query(..., min_length=2, max_length=10)) -> dict[str, Any]:
    try:
        conn = _word_detail_conn()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        with conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(_WORD_DETAIL_SQL, {"word": word, "lang": lang})
                row = cur.fetchone()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"DB query failed: {exc}") from exc
    finally:
        conn.close()

    if row is None:
        raise HTTPException(status_code=404, detail=f"Word '{word}' not found in language '{lang}'")

    data = dict(row)

    # Decode JSONB fields that psycopg2 may return as strings in older drivers
    for field_name in ("definitions", "synonyms", "antonyms", "inflections", "raw_kaikki"):
        val = data.get(field_name)
        if isinstance(val, str):
            try:
                data[field_name] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                pass

    # Fall back to raw_kaikki senses when dedicated columns are empty
    raw = data.get("raw_kaikki") or {}
    if isinstance(raw, dict):
        senses = raw.get("senses") or []
        if not data.get("synonyms"):
            seen: set[str] = set()
            syns: list[str] = []
            for sense in senses:
                for s in (sense.get("synonyms") or []):
                    w = s.get("word") if isinstance(s, dict) else str(s)
                    if w and w not in seen:
                        seen.add(w)
                        syns.append(w)
            if syns:
                data["synonyms"] = syns
        if not data.get("antonyms"):
            seen_a: set[str] = set()
            ants: list[str] = []
            for sense in senses:
                for a in (sense.get("antonyms") or []):
                    w = a.get("word") if isinstance(a, dict) else str(a)
                    if w and w not in seen_a:
                        seen_a.add(w)
                        ants.append(w)
            if ants:
                data["antonyms"] = ants

    return data


# ---------------------------------------------------------------------------
# POST /api/endings
# ---------------------------------------------------------------------------

@app.post("/api/endings")
async def post_endings(req: EndingsRequest) -> dict[str, Any]:
    # Build the LIKE pattern: suffix search or anywhere search
    suffix_lower = req.suffix.lower()
    if req.anywhere:
        pattern = f"%{suffix_lower}%"
    else:
        pattern = f"%{suffix_lower}"

    # Build WHERE clauses dynamically
    conditions = [
        "language = %(lang)s",
        "LOWER(word) LIKE %(pattern)s",
        "word NOT LIKE '%% %%'",
        "is_ghost_word = FALSE",
    ]
    params: dict[str, Any] = {
        "lang": req.lang,
        "pattern": pattern,
        "limit": req.limit,
    }

    if req.pos is not None:
        conditions.append("pos = %(pos)s")
        params["pos"] = req.pos
    if req.meter is not None:
        conditions.append("meter = %(meter)s")
        params["meter"] = req.meter
    if req.syllable_count is not None:
        conditions.append("syllable_count = %(syllable_count)s")
        params["syllable_count"] = req.syllable_count

    where = " AND ".join(conditions)

    sql = f"""
        SELECT
            word, language, ipa, rhyme_part, stress_pattern,
            meter, syllable_count, pos, gender, frequency_score
        FROM words
        WHERE {where}
        ORDER BY frequency_score DESC
        LIMIT %(limit)s
    """

    try:
        conn = _word_detail_conn()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        with conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"DB query failed: {exc}") from exc
    finally:
        conn.close()

    results = [
        {**dict(row), "purity_score": 1.0}
        for row in rows
    ]

    return {
        "results": results,
        "meta": {"total": len(results)},
    }


# ---------------------------------------------------------------------------
# GET /api/top-words/{lang}
# Frequency-ranked lemma list for programmatic-SEO static generation
# (Next.js generateStaticParams + sitemap). Words only, deduped across POS.
# ---------------------------------------------------------------------------

_DEFAULT_TOP_POS = ["noun", "verb", "adj", "adv"]

_TOP_WORDS_SQL = """
SELECT word, MAX(frequency_score) AS f
FROM words
WHERE language = %(lang)s
  AND frequency_score > 0
  AND is_ghost_word = FALSE
  AND is_multiword = FALSE
  AND is_inflected_form = FALSE
  AND pos = ANY(%(pos)s)
GROUP BY word
ORDER BY f DESC
LIMIT %(limit)s
"""

@app.get("/api/top-words/{lang}")
async def get_top_words(
    lang: str,
    limit: int = Query(1000, ge=1, le=100000),
    pos: str | None = Query(None, description="Comma-separated POS filter"),
) -> JSONResponse:
    pos_list = (
        [p.strip() for p in pos.split(",") if p.strip()] if pos else _DEFAULT_TOP_POS
    )

    try:
        conn = _word_detail_conn()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        with conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    _TOP_WORDS_SQL,
                    {"lang": lang, "pos": pos_list, "limit": limit},
                )
                rows = cur.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"DB query failed: {exc}") from exc
    finally:
        conn.close()

    words = [row["word"] for row in rows]
    return JSONResponse(
        content={"lang": lang, "count": len(words), "words": words},
        headers={"Cache-Control": "public, max-age=86400"},
    )


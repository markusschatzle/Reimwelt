"use client";

import React, { useState, useCallback, useMemo } from "react";

import { LANGS, POS_LABELS } from "../constants.js";
import { searchRhymes, fetchWordDetail } from "../api.js";
import {
  sortResults,
  canonicalKey,
  formRank,
  deduplicateResults,
} from "../utils.js";

import LangDropdown from "../components/LangDropdown.jsx";
import SearchBar from "../components/SearchBar.jsx";
import FilterBar from "../components/FilterBar.jsx";
import WordChip from "../components/WordChip.jsx";
import SkeletonGrid from "../components/SkeletonGrid.jsx";
import ResultsMeta from "../components/ResultsMeta.jsx";
import EmptyState from "../components/EmptyState.jsx";
import WordDetailPanel from "../components/WordDetailPanel.jsx";

// ---------------------------------------------------------------------------
// Lock icons
// ---------------------------------------------------------------------------

function LockClosedIcon() {
  return (
    <svg width="11" height="14" viewBox="0 0 16 20" fill="none" aria-hidden="true">
      <path d="M8 10.999C7.73478 10.999 7.48043 11.1043 7.29289 11.2919C7.10536 11.4794 7 11.7337 7 11.999V14.999C7 15.2642 7.10536 15.5185 7.29289 15.7061C7.48043 15.8936 7.73478 15.999 8 15.999C8.26522 15.999 8.51957 15.8936 8.70711 15.7061C8.89464 15.5185 9 15.2642 9 14.999V11.999C9 11.7337 8.89464 11.4794 8.70711 11.2919C8.51957 11.1043 8.26522 10.999 8 10.999Z" fill="currentColor"/>
      <path d="M15.1213 7.87762C14.5587 7.31501 13.7956 6.99894 13 6.99894C12.2044 6.99894 5 6.99894 5 6.99894V4.99894C4.99854 4.40513 5.17334 3.82424 5.50226 3.32985C5.83118 2.83545 6.29942 2.44979 6.84768 2.2217C7.21463 2.06905 7.60638 1.99157 8 1.99157V0C7.3454 4.44388e-06 6.6939 0.128562 6.08346 0.381899C5.17078 0.760665 4.3908 1.40137 3.84201 2.22312C3.29321 3.04486 3.00021 4.01079 3 4.99894V6.99894C2.20435 6.99894 1.44129 7.31501 0.87868 7.87762C0.316071 8.44023 0 9.20329 0 9.99894V16.9989C0 17.7946 0.316071 18.5577 0.87868 19.1203C1.44129 19.6829 2.20435 19.9989 3 19.9989H13C13.7956 19.9989 14.5587 19.6829 15.1213 19.1203C15.6839 18.5577 16 17.7946 16 16.9989V9.99894C16 9.20329 15.6839 8.44023 15.1213 7.87762ZM14 16.9989C14 17.2642 13.8946 17.5185 13.7071 17.7061C13.5196 17.8936 13.2652 17.9989 13 17.9989H3C2.73478 17.9989 2.48043 17.8936 2.29289 17.7061C2.10536 17.5185 2 17.2642 2 16.9989V9.99894C2 9.73373 2.10536 9.47937 2.29289 9.29184C2.48043 9.1043 2.73478 8.99894 3 8.99894H13C13.2652 8.99894 13.5196 9.1043 13.7071 9.29184C13.8946 9.47937 14 9.73373 14 9.99894V16.9989Z" fill="currentColor"/>
      <path d="M8 0V1.99157C8.39362 1.99157 8.78537 2.06905 9.15232 2.2217C9.70058 2.44979 10.1688 2.83545 10.4977 3.32985C10.8267 3.82424 11.0015 4.40513 11 4.99894V5V6.99894H13V4.99894C12.9998 4.01079 12.7068 3.04486 12.158 2.22312C11.6092 1.40137 10.8292 0.760665 9.91654 0.381899C9.3061 0.128561 8.6546 4.44388e-06 8 0Z" fill="currentColor"/>
    </svg>
  );
}

function LockOpenIcon() {
  return (
    <svg width="11" height="14" viewBox="0 0 16 20" fill="none" aria-hidden="true">
      <path d="M8 10.9989C7.73478 10.9989 7.48043 11.1043 7.29289 11.2918C7.10536 11.4794 7 11.7337 7 11.9989V14.9989C7 15.2642 7.10536 15.5185 7.29289 15.7061C7.48043 15.8936 7.73478 15.9989 8 15.9989C8.26522 15.9989 8.51957 15.8936 8.70711 15.7061C8.89464 15.5185 9 15.2642 9 14.9989V11.9989C9 11.7337 8.89464 11.4794 8.70711 11.2918C8.51957 11.1043 8.26522 10.9989 8 10.9989ZM13 6.99894H5V4.99894C4.99854 4.40513 5.17334 3.82424 5.50226 3.32985C5.83118 2.83545 6.29942 2.44979 6.84768 2.2217C7.39594 1.99362 7.99956 1.93337 8.58209 2.04859C9.16462 2.16381 9.69985 2.44931 10.12 2.86894C10.4959 3.25301 10.7649 3.72877 10.9 4.24894C10.9328 4.37633 10.9904 4.49599 11.0695 4.60112C11.1486 4.70624 11.2476 4.79476 11.3609 4.86161C11.4742 4.92847 11.5995 4.97236 11.7298 4.99078C11.86 5.00919 11.9926 5.00177 12.12 4.96894C12.2474 4.93611 12.3671 4.87851 12.4722 4.79944C12.5773 4.72036 12.6658 4.62135 12.7327 4.50806C12.7995 4.39477 12.8434 4.26943 12.8618 4.13918C12.8802 4.00893 12.8728 3.87633 12.84 3.74894C12.6122 2.88374 12.1603 2.09388 11.53 1.45894C10.8302 0.761309 9.93934 0.286679 8.96996 0.0949864C8.00058 -0.0967066 6.99614 0.00313342 6.08346 0.381899C5.17078 0.760665 4.3908 1.40137 3.84201 2.22312C3.29321 3.04486 3.00021 4.01079 3 4.99894V6.99894C2.20435 6.99894 1.44129 7.31501 0.87868 7.87762C0.316071 8.44023 0 9.20329 0 9.99894V16.9989C0 17.7946 0.316071 18.5577 0.87868 19.1203C1.44129 19.6829 2.20435 19.9989 3 19.9989H13C13.7956 19.9989 14.5587 19.6829 15.1213 19.1203C15.6839 18.5577 16 17.7946 16 16.9989V9.99894C16 9.20329 15.6839 8.44023 15.1213 7.87762C14.5587 7.31501 13.7956 6.99894 13 6.99894ZM14 16.9989C14 17.2642 13.8946 17.5185 13.7071 17.7061C13.5196 17.8936 13.2652 17.9989 13 17.9989H3C2.73478 17.9989 2.48043 17.8936 2.29289 17.7061C2.10536 17.5185 2 17.2642 2 16.9989V9.99894C2 9.73373 2.10536 9.47937 2.29289 9.29184C2.48043 9.1043 2.73478 8.99894 3 8.99894H13C13.2652 8.99894 13.5196 9.1043 13.7071 9.29184C13.8946 9.47937 14 9.73373 14 9.99894V16.9989Z" fill="currentColor"/>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Error banner
// ---------------------------------------------------------------------------

function ErrorBanner({ message }) {
  return (
    <div className="error-banner">
      <span>⚠</span>
      <span>{message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReimePage
// ---------------------------------------------------------------------------

export default function ReimePage({
  lang = "de",
  sourceLang: sourceLangProp,
  targetLang: targetLangProp,
  langLocked: langLockedProp,
  initialWord = "",
  initialResults = null,
  initialQueryMeta = null,
  initialMeta = null,
}) {
  // Search state. sourceLang/targetLang default to `lang` (same-language search);
  // the cross-language pages pass distinct source/target with the lock off.
  const [query, setQuery] = useState(initialWord);
  const [sourceLang, setSourceLang] = useState(sourceLangProp ?? lang);
  const [targetLang, setTargetLang] = useState(targetLangProp ?? lang);
  const [langLocked, setLangLocked] = useState(langLockedProp ?? true);
  const [sortMode, setSortMode] = useState("balanced");
  const [syllableCount, setSyllableCount] = useState(null);

  // Results state — seeded from server-side render on word pages so the rhyme
  // list is identical pre- and post-hydration (no refetch flash).
  const [baseResults, setBaseResults] = useState(initialResults || []);
  const [queryMeta, setQueryMeta] = useState(initialQueryMeta);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(initialResults != null);
  const [meterFilter, setMeterFilter] = useState(null);
  const [posFilter, setPosFilter] = useState(null);

  // Detail panel state
  const [selectedWord, setSelectedWord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Derived
  const meterCounts = useMemo(() => {
    const counts = {};
    for (const r of baseResults) {
      if (r.meter) counts[r.meter] = (counts[r.meter] || 0) + 1;
    }
    return counts;
  }, [baseResults]);

  const posCounts = useMemo(() => {
    const counts = {};
    for (const r of baseResults) {
      if (r.pos) counts[r.pos] = (counts[r.pos] || 0) + 1;
    }
    return counts;
  }, [baseResults]);

  const syllableCounts = useMemo(() => {
    const counts = {};
    for (const r of baseResults) {
      const s = r.syllable_count;
      if (!s) continue;
      const key = s >= 6 ? 6 : s;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [baseResults]);

  const displayResults = useMemo(() => {
    let filtered = syllableCount
      ? baseResults.filter((r) => {
          const s = r.syllable_count;
          return syllableCount === 6 ? s >= 6 : s === syllableCount;
        })
      : baseResults;

    filtered = meterFilter
      ? filtered.filter((r) => r.meter === meterFilter)
      : filtered;

    const sorted = sortResults(filtered, sortMode);

    if (posFilter) {
      return sorted.filter((r) => r.pos === posFilter);
    }

    return deduplicateResults(sorted);
  }, [baseResults, syllableCount, meterFilter, posFilter, sortMode]);

  // Search
  const runSearch = useCallback(
    async (overrideQuery) => {
      const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
      if (!q) return;

      setLoading(true);
      setError(null);
      setMeterFilter(null);
      setPosFilter(null);

      try {
        const data = await searchRhymes({
          word: q,
          source_lang: sourceLang,
          target_langs: [targetLang],
          sort_mode: sortMode.startsWith("alpha")
            ? "balanced"
            : sortMode.split("_")[0],
          limit: 500,
        });
        setBaseResults(data.results || []);
        setQueryMeta(data.query || null);
        setMeta(data.meta || null);
        setHasSearched(true);
      } catch (err) {
        setError(err.message || "Unbekannter Fehler");
        setBaseResults([]);
      } finally {
        setLoading(false);
      }
    },
    [query, sourceLang, targetLang, sortMode],
  );

  function handleKeyDown(e) {
    if (e.key === "Enter") runSearch();
  }

  function handleExampleClick(word) {
    setQuery(word);
    runSearch(word);
  }

  function handleSortMode(mode) {
    setSortMode(mode);
  }

  // Detail panel
  async function handleWordClick(result) {
    setSelectedWord(result);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const data = await fetchWordDetail(result.word, result.language);
      setDetailData(data);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleCloseDetail() {
    setSelectedWord(null);
    setDetailData(null);
  }

  function handleSearchFromDetail(word, lang) {
    setQuery(word);
    setSourceLang(lang);
    runSearch(word);
  }

  return (
    <div className="app">
      {/* Search section */}
      <div className="search-section">
        <SearchBar
          query={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onSearch={() => runSearch()}
          currentIpa={queryMeta?.ipa}
        />

        {/* Language row */}
        <div className="lang-row">
          <LangDropdown
            langs={LANGS}
            value={sourceLang}
            onChange={(lang) => {
              setSourceLang(lang);
              if (langLocked) setTargetLang(lang);
            }}
            label="Quellsprache"
          />
          <div className="lang-separator">
            <button
              type="button"
              className={`lang-lock-btn${langLocked ? " locked" : ""}`}
              onClick={() => setLangLocked((v) => !v)}
              title={langLocked ? "Sprachen entkoppeln" : "Sprachen koppeln"}
              aria-label={langLocked ? "Sprachen entkoppeln" : "Sprachen koppeln"}
              aria-pressed={langLocked}
            >
              {langLocked ? <LockClosedIcon /> : <LockOpenIcon />}
            </button>
            <span className="lang-arrow">→</span>
          </div>
          <LangDropdown
            langs={LANGS}
            value={targetLang}
            onChange={(lang) => {
              setTargetLang(lang);
              if (langLocked) setSourceLang(lang);
            }}
            label="Zielsprache"
          />
        </div>

        {/* Filter bar */}
        <FilterBar
          syllableCount={syllableCount}
          syllableCounts={syllableCounts}
          onSyllableCount={setSyllableCount}
          meterFilter={meterFilter}
          meterCounts={meterCounts}
          onMeterFilter={setMeterFilter}
          posFilter={posFilter}
          posCounts={posCounts}
          onPosFilter={setPosFilter}
        />
      </div>

      {/* Results section */}
      <div className="results-section">
        {error && <ErrorBanner message={error} />}

        {(hasSearched || meta) && !loading && (
          <ResultsMeta
            queryMeta={queryMeta}
            meta={meta}
            shownCount={displayResults.length}
            sortMode={sortMode}
            onSortMode={handleSortMode}
          />
        )}

        {loading ? (
          <SkeletonGrid />
        ) : displayResults.length > 0 ? (
          <div className="results-grid">
            {displayResults.map((result, i) => (
              <WordChip
                key={`${result.word}-${result.language}-${i}`}
                result={result}
                index={i}
                onDetailClick={handleWordClick}
              />
            ))}
          </div>
        ) : (
          !error && (
            <EmptyState
              hasSearched={hasSearched}
              onExampleClick={handleExampleClick}
            />
          )
        )}
      </div>

      {/* Word detail panel */}
      <WordDetailPanel
        selectedWord={selectedWord}
        detailData={detailData}
        detailLoading={detailLoading}
        onClose={handleCloseDetail}
        onSearchWord={handleSearchFromDetail}
      />
    </div>
  );
}

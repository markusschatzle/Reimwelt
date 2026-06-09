"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";

import { LANGS } from "../constants.js";
import { searchEndings, fetchWordDetail } from "../api.js";
import { sortResults, deduplicateResults } from "../utils.js";

import LangDropdown from "../components/LangDropdown.jsx";
import SearchBar from "../components/SearchBar.jsx";
import FilterBar from "../components/FilterBar.jsx";
import WordChip from "../components/WordChip.jsx";
import SkeletonGrid from "../components/SkeletonGrid.jsx";
import WordDetailPanel from "../components/WordDetailPanel.jsx";
import ResultsMeta from "../components/ResultsMeta.jsx";

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
// Empty state for Endungen page
// ---------------------------------------------------------------------------

const EXAMPLES = ["heit", "ung", "keit", "lich", "schaft"];

function EndungenEmptyState({ hasSearched, onExampleClick }) {
  if (hasSearched) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Keine Wörter gefunden.</p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Versuche eine andere Endung oder wähle „Auch im Wortinneren".
        </p>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <p className="empty-state-title">Gib eine Wortendung ein</p>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: "0.9rem",
          marginBottom: "16px",
        }}
      >
        z. B. alle Wörter auf <em>-heit</em> wie „Hoheit", „Einheit" …
      </p>
      <div className="example-pills">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            className="pill"
            type="button"
            onClick={() => onExampleClick(ex)}
          >
            -{ex}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adapted ResultsMeta for Endungen (shows "N Wörter gefunden mit Endung -x")
// ---------------------------------------------------------------------------

function EndungenResultsMeta({
  suffix,
  shownCount,
  anywhere,
  sortMode,
  onSortMode,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const SORT_OPTIONS = [
    { value: "balanced", label: "Ausgewogen" },
    { value: "usefulness", label: "Häufigkeit" },
    { value: "alpha_asc", label: "A→Z" },
    { value: "alpha_desc", label: "Z→A" },
  ];

  const sortLabel =
    SORT_OPTIONS.find((s) => s.value === sortMode)?.label || sortMode;

  return (
    <div className="results-meta-bar">
      <div className="results-meta-text">
        <span>
          <strong>{shownCount}</strong>{" "}
          {anywhere
            ? `Wörter mit „${suffix}" gefunden`
            : `Wörter auf „-${suffix}" gefunden`}
        </span>
        <span>· sortiert nach {sortLabel}</span>
      </div>

      <div className="sort-dropdown" ref={ref}>
        <span
          className="sort-label"
          onClick={() => setOpen((v) => !v)}
          style={{ cursor: "pointer" }}
        >
          Sortiert nach
        </span>
        <button
          className={`sort-icon-btn${open ? " open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          title={`Sortierung: ${sortLabel}`}
          type="button"
        >
          <svg
            width="16"
            height="13"
            viewBox="0 0 16 13"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 1.5h14M1 6.5h9M1 11.5h5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {open && (
          <div className="sort-dropdown-panel">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`sort-option${sortMode === s.value ? " active" : ""}`}
                onClick={() => {
                  onSortMode(s.value);
                  setOpen(false);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EndungenPage
// ---------------------------------------------------------------------------

export default function EndungenPage({
  lang: initialLang = "de",
  initialSuffix = "",
  initialResults = null,
  initialMeta = null,
  navigateOnSearch = null,
}) {
  const router = useRouter();

  // Search state
  const [query, setQuery] = useState(initialSuffix);
  const [lang, setLang] = useState(initialLang);
  const [anywhere, setAnywhere] = useState(false);
  const [sortMode, setSortMode] = useState("balanced");
  const [syllableCount, setSyllableCount] = useState(null);

  // Results state — seeded from server-side render on ending pages so results
  // appear in the SSR HTML and don't refetch on hydration.
  const [baseResults, setBaseResults] = useState(initialResults || []);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(initialResults != null);
  const [meterFilter, setMeterFilter] = useState(null);
  const [posFilter, setPosFilter] = useState(null);
  const [lastQuery, setLastQuery] = useState(initialSuffix);

  // Detail panel state
  const [selectedWord, setSelectedWord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Derived counts for FilterBar
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
    const queryLower = lastQuery.toLowerCase();
    let filtered = baseResults.filter(
      (r) => r.word.toLowerCase() !== queryLower,
    );

    filtered = syllableCount
      ? filtered.filter((r) => {
          const s = r.syllable_count;
          return syllableCount === 6 ? s >= 6 : s === syllableCount;
        })
      : filtered;

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
    async (overrideQuery, overrideAnywhere) => {
      const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
      if (!q) return;

      // On an SEO ending page, a new search hands off to the endings landing.
      if (navigateOnSearch) {
        router.push(`${navigateOnSearch}?q=${encodeURIComponent(q)}`);
        return;
      }

      const anywhereVal =
        overrideAnywhere !== undefined ? overrideAnywhere : anywhere;

      setLoading(true);
      setError(null);
      setMeterFilter(null);
      setPosFilter(null);

      try {
        const data = await searchEndings({
          suffix: q,
          lang,
          anywhere: anywhereVal,
          limit: 500,
        });
        setBaseResults(data.results || []);
        setMeta(data.meta || null);
        setHasSearched(true);
        setLastQuery(q);
      } catch (err) {
        setError(err.message || "Unbekannter Fehler");
        setBaseResults([]);
      } finally {
        setLoading(false);
      }
    },
    [query, lang, anywhere, navigateOnSearch, router],
  );

  function handleKeyDown(e) {
    if (e.key === "Enter") runSearch();
  }

  // On the endings landing, pick up a ?q= handed off from an SEO page.
  useEffect(() => {
    if (navigateOnSearch || hasSearched) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && q.trim()) {
      setQuery(q);
      runSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run when the language changes — but not on mount, so a server-seeded
  // ending page doesn't refetch over its SSR results during hydration.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (hasSearched) runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  function handleExampleClick(word) {
    setQuery(word);
    runSearch(word);
  }

  // Toggle "anywhere" — re-search immediately if already searched
  function handleAnywhereToggle(val) {
    setAnywhere(val);
    if (hasSearched) runSearch(undefined, val);
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

  function handleSearchFromDetail(word, detailLang) {
    setQuery(word);
    setLang(detailLang);
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
          placeholder="Endung eingeben, z. B. heit …"
          buttonLabel="Suchen"
          currentIpa={null}
        />

        {/* Language row — single selector */}
        <div className="lang-row">
          <LangDropdown
            langs={LANGS}
            value={lang}
            onChange={setLang}
            label="Sprache"
          />
        </div>

        {/* Anywhere toggle */}
        <div className="filter-bar">
          <div className="filter-inner">
            <div
              className="filter-row"
              style={{ justifyContent: "center", gap: "8px" }}
            >
              <button
                type="button"
                className={`pill${!anywhere ? " active" : ""}`}
                onClick={() => handleAnywhereToggle(false)}
              >
                Nur am Wortende
              </button>
              <button
                type="button"
                className={`pill${anywhere ? " active" : ""}`}
                onClick={() => handleAnywhereToggle(true)}
              >
                Auch im Wortinneren
              </button>
            </div>
          </div>
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

        {hasSearched && !loading && (
          <EndungenResultsMeta
            suffix={lastQuery}
            shownCount={displayResults.length}
            anywhere={anywhere}
            sortMode={sortMode}
            onSortMode={setSortMode}
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
            <EndungenEmptyState
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

"use client";

import React, { useState, useRef, useEffect } from "react";
import { SORT_MODES } from "../constants.js";

function SortArrow({ dir }) {
  return dir === "asc" ? (
    <svg
      className="sort-dir-arrow"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 8.5V1.5M2 4l3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg
      className="sort-dir-arrow"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 1.5v7M2 6l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ResultsMeta({
  queryMeta,
  meta,
  shownCount,
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

  if (!queryMeta || !meta) return null;

  const sortEntry = SORT_MODES.find((s) => s.value === sortMode);
  const sortLabel = sortEntry?.label || sortMode;
  const sortDir = sortEntry?.dir;
  const threshold =
    meta.threshold_used !== null && meta.threshold_used !== undefined
      ? meta.threshold_used === 0
        ? "0"
        : meta.threshold_used.toExponential(0)
      : "—";

  return (
    <div className="results-meta-bar">
      <div className="results-meta-text">
        <span>
          <strong>{shownCount}</strong> Reime gefunden für „{queryMeta.word}"
        </span>
        {queryMeta.rhyme_part && (
          <span className="rhyme-part-badge">{queryMeta.rhyme_part}</span>
        )}
        <span>
          · sortiert nach {sortLabel}
          {sortDir && (
            <>
              {" "}
              <SortArrow dir={sortDir} />
            </>
          )}
        </span>
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
            {SORT_MODES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`sort-option${sortMode === s.value ? " active" : ""}`}
                onClick={() => {
                  onSortMode(s.value);
                  setOpen(false);
                }}
              >
                <span>{s.label}</span>
                {s.dir && <SortArrow dir={s.dir} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

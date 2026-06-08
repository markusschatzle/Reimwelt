"use client";

import React, { useState, useRef, useEffect } from "react";
import Pill from "./Pill.jsx";
import { METER_LABELS, METER_PATTERNS, POS_LABELS } from "../constants.js";
import { MeterDots } from "../views/wissenswelt/_widgets.jsx";

function InfoIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M6 5.5v3"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="6" cy="3.5" r="0.65" fill="currentColor" />
    </svg>
  );
}

function MeterInfoTooltip() {
  const [visible, setVisible] = useState(false);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  return (
    <span className="meter-info-wrap">
      <button
        type="button"
        className="meter-info-btn"
        aria-label="Was ist ein Metrum?"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <InfoIcon />
      </button>
      <div
        className={`meter-tooltip${visible ? " meter-tooltip--visible" : ""}`}
        role="tooltip"
        aria-hidden={!visible}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <p className="meter-tooltip-text">
          Das Metrum ist das Betonungsmuster einer Silbenfolge. Hier
          visualisiert als betont (
          <MeterDots pattern="1" label="betont" />
          ) oder unbetont (
          <MeterDots pattern="0" label="unbetont" />
          ).
        </p>
        <div className="meter-tooltip-examples">
          {[
            ["01", "Jambus"],
            ["10", "Trochäus"],
            ["100", "Daktylus"],
          ].map(([pat, name]) => (
            <span key={pat} className="meter-tooltip-example">
              <MeterDots pattern={pat} label={name} />
              <span>{name}</span>
            </span>
          ))}
        </div>
      </div>
    </span>
  );
}

function FilterDropdown({
  label,
  labelExtra,
  value,
  onChange,
  options,
  gridRows = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find((o) => o.value === value);
  const panelId = `filter-dd-${(label || "options").toLowerCase()}`;

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="filter-dropdown-group" ref={ref}>
      {label && (
        <span className="filter-label-row">
          <span className="lang-label">{label}</span>
          {labelExtra}
        </span>
      )}
      <button
        className={`lang-trigger${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={panelId}
      >
        <span className="lang-trigger-label">
          {current ? current.label : "Alle"}
        </span>
        {current && (
          <span className="filter-dropdown-count">{current.count}</span>
        )}
        <svg
          className={`lang-chevron${open ? " open" : ""}`}
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          className={`filter-dd-panel${gridRows ? " filter-dd-panel--grid" : ""}`}
          role="listbox"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={`filter-dd-option${!value ? " active" : ""}`}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <span className="filter-dd-option-label">Alle</span>
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`filter-dd-option${gridRows && o.extra ? " filter-dd-option--grid" : ""}${o.value === value ? " active" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <span className="filter-dd-option-label">{o.label}</span>
              {o.extra}
              <span className="pill-count">{o.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({
  syllableCount,
  syllableCounts,
  onSyllableCount,
  meterFilter,
  meterCounts,
  onMeterFilter,
  posFilter,
  posCounts,
  onPosFilter,
}) {
  const syllables = [1, 2, 3, 4, 5, 6];
  const syllableLabel = (n) =>
    n === 1 ? "1 Silbe" : n === 6 ? "6+ Silben" : `${n} Silben`;

  const meterOptions = Object.entries(meterCounts).map(([k, v]) => ({
    value: k,
    label: METER_LABELS[k] || k,
    count: v,
    extra: METER_PATTERNS[k] ? (
      <MeterDots
        pattern={METER_PATTERNS[k]}
        label=""
        className="filter-dd-meter-dots"
      />
    ) : null,
  }));

  const hasResults =
    Object.keys(syllableCounts || {}).length > 0 ||
    meterOptions.length > 0 ||
    Object.keys(posCounts).length > 0;

  const posOptions = Object.entries(posCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({
      value: k,
      label: POS_LABELS[k] || k,
      count: v,
    }));

  const showDropdowns = meterOptions.length > 0 || posOptions.length > 0;

  return (
    <div className="filter-bar">
      <div className="filter-inner">
        {/* Row 1: Silben */}
        <div className="filter-row">
          {syllables.map((n) => {
            const count = syllableCounts?.[n] || 0;
            return (
              <Pill
                key={n}
                active={syllableCount === n}
                disabled={hasResults && count === 0}
                onClick={() => onSyllableCount(syllableCount === n ? null : n)}
              >
                {syllableLabel(n)}
                {hasResults && <span className="pill-count">{count}</span>}
              </Pill>
            );
          })}
        </div>

        {/* Row 2: Metrum + Wortart dropdowns */}
        {showDropdowns && (
          <div className="filter-row filter-dropdowns-row">
            {meterOptions.length > 0 && (
              <FilterDropdown
                label="Metrum"
                labelExtra={<MeterInfoTooltip />}
                value={meterFilter}
                onChange={onMeterFilter}
                options={meterOptions}
                gridRows
              />
            )}
            {posOptions.length > 0 && (
              <FilterDropdown
                label="Wortart"
                value={posFilter}
                onChange={onPosFilter}
                options={posOptions}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { METER_LABELS } from "../constants.js";

function StressPattern({ pattern }) {
  if (!pattern) return null;
  return (
    <div className="stress-dots">
      {pattern.split("").map((ch, i) => (
        <div
          key={i}
          className={`stress-dot ${ch === "1" ? "stressed" : "unstressed"}`}
          title={ch === "1" ? "betont" : "unbetont"}
        />
      ))}
    </div>
  );
}

// wiktextract emits metadata markers in the inflection list (the table type
// and a "no-table-tags" sentinel) that aren't real word forms — drop them.
const JUNK_INFLECTION_TAGS = new Set(["table-tags", "inflection-template"]);

function InflectionsTable({ inflections }) {
  if (!Array.isArray(inflections) || inflections.length === 0) return null;
  const rows = inflections
    .filter((inf) => inf && typeof inf === "object")
    .filter((inf) => {
      const tags = Array.isArray(inf.tags) ? inf.tags : [];
      return !tags.some((t) => JUNK_INFLECTION_TAGS.has(t));
    })
    .slice(0, 30);
  if (rows.length === 0) return null;

  return (
    <table className="inflections-table">
      <thead>
        <tr>
          <th>Form</th>
          <th>Tags</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((inf, i) => (
          <tr key={i}>
            <td>{inf.form || inf.word || "—"}</td>
            <td style={{ color: "var(--text-muted)" }}>
              {Array.isArray(inf.tags)
                ? inf.tags.join(", ")
                : String(inf.tags || "—")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function WordDetailPanel({
  selectedWord,
  detailData,
  detailLoading,
  onClose,
  onSearchWord,
}) {
  const isOpen = !!selectedWord;
  const closeRef = useRef(null);

  // Portals to document.body, which doesn't exist during SSR. Render nothing
  // on the server / first client paint, then mount on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.classList.toggle("detail-panel-open", isOpen);
    return () => document.body.classList.remove("detail-panel-open");
  }, [isOpen]);

  // Move focus to close button when panel opens
  useEffect(() => {
    if (isOpen && closeRef.current) {
      closeRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  function handleAudio() {
    if (detailData?.audio_url) {
      new Audio(detailData.audio_url).play().catch(() => {});
    }
  }

  function handleSynonymClick(word, lang) {
    onSearchWord(word, lang);
    onClose();
  }

  const synonyms = useMemo(() => {
    if (!detailData?.synonyms) return [];
    return Array.isArray(detailData.synonyms) ? detailData.synonyms : [];
  }, [detailData]);

  const antonyms = useMemo(() => {
    if (!detailData?.antonyms) return [];
    return Array.isArray(detailData.antonyms) ? detailData.antonyms : [];
  }, [detailData]);

  const definitions = useMemo(() => {
    if (!detailData?.definitions) return [];
    return Array.isArray(detailData.definitions) ? detailData.definitions : [];
  }, [detailData]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={`detail-overlay${isOpen ? " visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`detail-panel${isOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-panel-title"
        aria-hidden={!isOpen}
      >
        <div className="detail-header">
          <div className="detail-title-group">
            {selectedWord && (
              <>
                <div id="detail-panel-title" className="detail-word">
                  {selectedWord.word}
                </div>
                {selectedWord.ipa && (
                  <div className="detail-ipa">[{selectedWord.ipa}]</div>
                )}
              </>
            )}
          </div>
          <button
            ref={closeRef}
            className="detail-close-btn"
            onClick={onClose}
            aria-label="Schließen"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div
          className="detail-body"
          aria-live="polite"
          aria-busy={detailLoading}
        >
          {detailLoading && (
            <>
              <div className="skeleton-line" style={{ width: "60%" }} />
              <div className="skeleton-line" style={{ width: "40%" }} />
              <div className="skeleton-line" style={{ width: "80%" }} />
              <div className="skeleton-line" style={{ width: "55%" }} />
              <div className="skeleton-line" style={{ width: "70%" }} />
              <div className="skeleton-line" style={{ width: "45%" }} />
            </>
          )}

          {!detailLoading && detailData && (
            <>
              {/* Language / POS / Gender */}
              <div className="detail-section">
                <div className="detail-badges">
                  {detailData.language && (
                    <span className="detail-badge">
                      {detailData.language.toUpperCase()}
                    </span>
                  )}
                  {detailData.pos && (
                    <span className="detail-badge">{detailData.pos}</span>
                  )}
                  {detailData.gender && (
                    <span className="detail-badge">{detailData.gender}</span>
                  )}
                </div>
                {detailData.audio_url && (
                  <button className="detail-audio-btn" onClick={handleAudio}>
                    ▶ Anhören
                  </button>
                )}
              </div>

              {/* Hyphenation */}
              {detailData.hyphenation && (
                <div className="detail-section">
                  <div className="detail-section-label">Silbentrennung</div>
                  <div className="detail-hyphenation">
                    {detailData.hyphenation.split("·").join(" · ")}
                  </div>
                </div>
              )}

              {/* Stress pattern + meter */}
              {(detailData.stress_pattern || detailData.meter) && (
                <div className="detail-section">
                  {detailData.stress_pattern && (
                    <>
                      <div className="detail-section-label">Betonung</div>
                      <StressPattern pattern={detailData.stress_pattern} />
                    </>
                  )}
                  {detailData.meter && (
                    <div
                      style={{
                        marginTop: detailData.stress_pattern ? "8px" : 0,
                      }}
                    >
                      <span className="meter-badge">
                        {METER_LABELS[detailData.meter] || detailData.meter}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Definitions */}
              {definitions.length > 0 && (
                <div className="detail-section">
                  <div className="detail-section-label">Bedeutungen</div>
                  <ol className="definitions-list">
                    {definitions.map((def, i) => (
                      <li key={i}>
                        <span className="def-num">{i + 1}.</span>
                        <span>{def}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Etymology */}
              {detailData.etymology && (
                <div className="detail-section">
                  <div className="detail-section-label">Etymologie</div>
                  <div className="etymology-block">{detailData.etymology}</div>
                </div>
              )}

              {/* Synonyms */}
              {synonyms.length > 0 && (
                <div className="detail-section">
                  <div className="detail-section-label">Synonyme</div>
                  <div className="clickable-pills">
                    {synonyms.slice(0, 20).map((s, i) => {
                      const w =
                        typeof s === "string"
                          ? s
                          : s.word || s.sense || String(s);
                      return (
                        <button
                          key={i}
                          className="clickable-pill"
                          onClick={() =>
                            handleSynonymClick(w, detailData.language)
                          }
                        >
                          {w}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Antonyms */}
              {antonyms.length > 0 && (
                <div className="detail-section">
                  <div className="detail-section-label">Antonyme</div>
                  <div className="clickable-pills">
                    {antonyms.slice(0, 20).map((s, i) => {
                      const w =
                        typeof s === "string"
                          ? s
                          : s.word || s.sense || String(s);
                      return (
                        <button
                          key={i}
                          className="clickable-pill"
                          onClick={() =>
                            handleSynonymClick(w, detailData.language)
                          }
                        >
                          {w}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inflections */}
              {Array.isArray(detailData.inflections) &&
                detailData.inflections.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-label">Flexion</div>
                    <InflectionsTable inflections={detailData.inflections} />
                  </div>
                )}

              {/* Source note */}
              <div className="detail-source-note">
                Quelle: Wiktionary via kaikki.org
                {detailData.ipa_source && ` · IPA: ${detailData.ipa_source}`}
              </div>
            </>
          )}

          {!detailLoading && !detailData && selectedWord && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
              Keine weiteren Daten verfügbar.
            </p>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

"use client";

import React from "react";
import { EXAMPLE_WORDS } from "../constants.js";

export default function EmptyState({ hasSearched, onExampleClick }) {
  if (hasSearched) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Keine Reime gefunden</div>
        <div className="empty-state-sub">
          Versuche, die Filter zu lockern oder eine andere Schreibweise.
        </div>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-state-title" style={{ marginBottom: 16 }}>
        Gib ein Wort ein, um Reime zu finden.
      </div>
      <div className="example-pills">
        {EXAMPLE_WORDS.map((w) => (
          <button
            key={w}
            className="example-pill"
            onClick={() => onExampleClick(w)}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

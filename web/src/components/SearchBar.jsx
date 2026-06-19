"use client";

import React from "react";

export default function SearchBar({
  query,
  onChange,
  onKeyDown,
  onSearch,
  currentIpa,
  placeholder = "Wort eingeben …",
  buttonLabel = "Reime finden",
  autoFocus = false,
}) {
  return (
    <form
      className="search-bar-row"
      onSubmit={(e) => {
        e.preventDefault();
        // Dismiss mobile keyboard after submit
        e.currentTarget.querySelector("input")?.blur();
        onSearch();
      }}
    >
      <div className="search-bar-wrap">
        <input
          className="search-input"
          type="text"
          enterKeyHint="search"
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={onChange}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck="false"
          autoFocus={autoFocus}
        />
        {currentIpa && (
          <span className="search-ipa-display">[{currentIpa}]</span>
        )}
      </div>
      <button className="search-btn" type="submit">
        {buttonLabel}
      </button>
    </form>
  );
}

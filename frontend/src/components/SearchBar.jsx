import React from "react";

export default function SearchBar({
  query,
  onChange,
  onKeyDown,
  onSearch,
  currentIpa,
  placeholder = "Wort eingeben …",
  buttonLabel = "Reime finden",
}) {
  return (
    <form
      className="search-bar-row"
      onSubmit={(e) => {
        e.preventDefault();
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

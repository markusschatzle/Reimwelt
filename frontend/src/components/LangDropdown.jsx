import React, { useState, useRef, useEffect } from "react";

export default function LangDropdown({ langs, value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btnRef = useRef(null);
  const current = langs.find((l) => l.code === value) || langs[0];

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lang-dropdown-group" ref={ref}>
      {label && <span className="lang-label">{label}</span>}
      <button
        ref={btnRef}
        className={`lang-trigger${open ? " open" : ""}`}
        onClick={() => {
          const newOpen = !open;
          if (newOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            document.documentElement.style.setProperty("--lang-panel-top", `${rect.bottom + 6}px`);
            document.documentElement.style.setProperty("--lang-panel-left", `${rect.left + rect.width / 2}px`);
          }
          setOpen(newOpen);
        }}
        type="button"
      >
        <span className="lang-trigger-code">{current.code}</span>
        <span className="lang-trigger-label">{current.label}</span>
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
        <div className="lang-dropdown-panel">
          {langs.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`lang-option${l.code === value ? " active" : ""}`}
              onClick={() => {
                onChange(l.code);
                setOpen(false);
              }}
            >
              <span className="lang-option-code">{l.code}</span>
              <span className="lang-option-label">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

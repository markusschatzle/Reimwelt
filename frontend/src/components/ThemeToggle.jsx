import React from "react";
import { useTheme } from "../ThemeContext.jsx";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z" />
    </svg>
  );
}

export default function ThemeToggle({ className = "" }) {
  const { dark, toggle } = useTheme();

  return (
    <button
      className={`theme-toggle${dark ? " theme-toggle--dark" : ""}${className ? " " + className : ""}`}
      onClick={toggle}
      aria-label={dark ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"}
      title={dark ? "Hellmodus" : "Dunkelmodus"}
      type="button"
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-icon theme-toggle-icon--sun">
          <SunIcon />
        </span>
        <span className="theme-toggle-icon theme-toggle-icon--moon">
          <MoonIcon />
        </span>
        <span className="theme-toggle-thumb">
          <span className="theme-toggle-thumb-icon theme-toggle-thumb-icon--sun">
            <SunIcon />
          </span>
          <span className="theme-toggle-thumb-icon theme-toggle-thumb-icon--moon">
            <MoonIcon />
          </span>
        </span>
      </span>
    </button>
  );
}

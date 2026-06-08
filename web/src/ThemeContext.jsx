"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Start neutral so the server-rendered HTML and the first client render match
  // (avoids hydration mismatch). The no-FOUC inline script in the root layout
  // has already set <html data-theme> before paint, so there is no visual flash.
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  // Sync state from what the inline script / storage decided, once mounted.
  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    let isDark;
    if (attr) {
      isDark = attr === "dark";
    } else {
      const stored = localStorage.getItem("theme");
      isDark = stored
        ? stored === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    setDark(isDark);
    setReady(true);
  }, []);

  // Persist + reflect to the DOM only after the initial sync.
  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light",
    );
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark, ready]);

  function toggle() {
    document.documentElement.classList.add("theme-transitioning");
    setDark((v) => !v);
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 300);
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

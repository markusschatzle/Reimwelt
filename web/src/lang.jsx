"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE } from "./routes.js";

const LangContext = createContext(DEFAULT_LOCALE);

export function LangProvider({ lang, children }) {
  return (
    <LangContext.Provider value={lang || DEFAULT_LOCALE}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

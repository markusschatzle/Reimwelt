"use client";

import { useEffect, useRef, useState } from "react";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";

// Client shell: Header, the spotlight-tracking <main>, Footer, copy toast and
// cookie banner. Ported from the old App.jsx (minus React Router). Rendered
// inside [lang]/layout so it sits within LangProvider + ThemeProvider.

export default function AppShell({ children }) {
  const mainRef = useRef(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef(null);

  // Consent Mode v2 is initialised in layout.jsx (synchronous inline script)
  // and managed by Google's CMP. No custom consent init needed here.

  // "Copied" toast, triggered by WordChip via a window event.
  useEffect(() => {
    function onCopied() {
      setToastVisible(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastVisible(false), 2000);
    }
    window.addEventListener("word-copied", onCopied);
    return () => window.removeEventListener("word-copied", onCopied);
  }, []);

  // Spotlight cursor effect on the main content area (CSS variables).
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    let targetX = 50,
      targetY = 50;
    let currentX = 50,
      currentY = 50;
    let rafId = null;

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function tick() {
      currentX = lerp(currentX, targetX, 0.1);
      currentY = lerp(currentY, targetY, 0.1);
      el.style.setProperty("--mouse-x", `${currentX}%`);
      el.style.setProperty("--mouse-y", `${currentY}%`);
      rafId = requestAnimationFrame(tick);
    }

    function onMouseMove(e) {
      const rect = el.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width) * 100;
      targetY = ((e.clientY - rect.top) / rect.height) * 100;
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    function onMouseEnter() {
      el.style.setProperty("--spotlight-opacity", "1");
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    function onMouseLeave() {
      el.style.setProperty("--spotlight-opacity", "0");
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseenter", onMouseEnter);
    el.addEventListener("mouseleave", onMouseLeave);

    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseenter", onMouseEnter);
      el.removeEventListener("mouseleave", onMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <Header />
      <main className="main-content" ref={mainRef}>
        {children}
      </main>
      <Footer />
      <div
        className={`copy-toast${toastVisible ? " copy-toast--visible" : ""}`}
      >
        ✓ Kopiert
      </div>
    </>
  );
}

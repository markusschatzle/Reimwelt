import React, { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
import "./styles.css";

import { ThemeProvider } from "./ThemeContext.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import CookieBanner from "./components/CookieBanner.jsx";
import ReimePage from "./pages/ReimePage.jsx";
import EndungenPage from "./pages/EndungenPage.jsx";
import ImpressumPage from "./pages/ImpressumPage.jsx";
import DatenschutzPage from "./pages/DatenschutzPage.jsx";
import WissensweltPage from "./pages/wissenswelt/WissensweltPage.jsx";
import ReimenPage from "./pages/wissenswelt/ReimenPage.jsx";
import HomographePage from "./pages/wissenswelt/HomographePage.jsx";
import MetrumPage from "./pages/wissenswelt/MetrumPage.jsx";
import IpaPage from "./pages/wissenswelt/IpaPage.jsx";

// ---------------------------------------------------------------------------
// App shell (routing)
// ---------------------------------------------------------------------------

export default function App() {
  const mainRef = useRef(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    function onCopied() {
      setToastVisible(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastVisible(false), 2000);
    }
    window.addEventListener("word-copied", onCopied);
    return () => window.removeEventListener("word-copied", onCopied);
  }, []);

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
    <ThemeProvider>
      <>
        <ScrollToTop />
        <Header />
        <main className="main-content" ref={mainRef}>
          <Routes>
            <Route path="/" element={<Navigate to="/reime" replace />} />
            <Route path="/reime" element={<ReimePage />} />
            <Route path="/endungen" element={<EndungenPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route path="/wissenswelt" element={<WissensweltPage />} />
            <Route path="/wissenswelt/reimen" element={<ReimenPage />} />
            <Route
              path="/wissenswelt/homographe"
              element={<HomographePage />}
            />
            <Route path="/wissenswelt/metrum" element={<MetrumPage />} />
            <Route path="/wissenswelt/ipa" element={<IpaPage />} />
          </Routes>
        </main>
        <Footer />
        <div
          className={`copy-toast${toastVisible ? " copy-toast--visible" : ""}`}
        >
          ✓ Kopiert
        </div>
        <CookieBanner />
      </>
    </ThemeProvider>
  );
}

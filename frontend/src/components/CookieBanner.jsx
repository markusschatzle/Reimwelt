import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getStoredConsent,
  acceptAll,
  rejectAll,
  savePreferences,
} from "../consent.js";

// ---------------------------------------------------------------------------
// GDPR cookie banner — granular consent (Statistics / Marketing)
// ---------------------------------------------------------------------------
// Shows on first visit. Re-opened later via the footer "Cookie-Einstellungen"
// link, which dispatches the `open-cookie-settings` window event.

export default function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [statistics, setStatistics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!getStoredConsent()) setOpen(true);

    function reopen() {
      const stored = getStoredConsent();
      setStatistics(stored?.statistics ?? false);
      setMarketing(stored?.marketing ?? false);
      setShowSettings(true);
      setOpen(true);
    }

    window.addEventListener("open-cookie-settings", reopen);
    return () => window.removeEventListener("open-cookie-settings", reopen);
  }, []);

  // Move focus to the banner when it appears, for keyboard/screen-reader users.
  useEffect(() => {
    if (open && containerRef.current) containerRef.current.focus();
  }, [open]);

  if (!open) return null;

  function close() {
    setOpen(false);
    setShowSettings(false);
  }

  function handleAcceptAll() {
    acceptAll();
    close();
  }

  function handleRejectAll() {
    rejectAll();
    close();
  }

  function handleSave() {
    savePreferences({ statistics, marketing });
    close();
  }

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      tabIndex={-1}
      ref={containerRef}
    >
      <h2 id="cookie-banner-title" className="cookie-banner-title">
        Cookies & Datenschutz
      </h2>
      <p id="cookie-banner-desc" className="cookie-banner-desc">
        Wir verwenden Cookies, um unsere Website bereitzustellen. Mit Ihrer
        Einwilligung nutzen wir zusätzlich Google Analytics (Statistik) und
        Google Ads (Marketing). Diese Dienste setzen Cookies und übertragen
        Daten an Google. Sie können Ihre Auswahl jederzeit anpassen. Mehr dazu
        in unserer{" "}
        <Link to="/datenschutz" onClick={close}>
          Datenschutzerklärung
        </Link>
        .
      </p>

      {showSettings && (
        <div className="cookie-options" role="group" aria-label="Cookie-Kategorien">
          <div className="cookie-option">
            <div className="cookie-option-text">
              <div className="cookie-option-name">Notwendig</div>
              <div className="cookie-option-detail">
                Erforderlich für den Betrieb der Website (z. B. Speicherung
                Ihrer Cookie-Auswahl und des Designs). Immer aktiv.
              </div>
            </div>
            <label className="cookie-switch cookie-switch--locked">
              <input type="checkbox" checked disabled aria-label="Notwendige Cookies (immer aktiv)" />
              <span className="cookie-switch-track" aria-hidden="true">
                <span className="cookie-switch-thumb" />
              </span>
            </label>
          </div>

          <div className="cookie-option">
            <div className="cookie-option-text">
              <div className="cookie-option-name">Statistik</div>
              <div className="cookie-option-detail">
                Google Analytics hilft uns zu verstehen, wie die Website genutzt
                wird, um sie zu verbessern.
              </div>
            </div>
            <label className="cookie-switch">
              <input
                type="checkbox"
                checked={statistics}
                onChange={(e) => setStatistics(e.target.checked)}
                aria-label="Statistik-Cookies (Google Analytics)"
              />
              <span className="cookie-switch-track" aria-hidden="true">
                <span className="cookie-switch-thumb" />
              </span>
            </label>
          </div>

          <div className="cookie-option">
            <div className="cookie-option-text">
              <div className="cookie-option-name">Marketing</div>
              <div className="cookie-option-detail">
                Google Ads ermöglicht personalisierte Werbung und die Messung
                von Werbekampagnen.
              </div>
            </div>
            <label className="cookie-switch">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                aria-label="Marketing-Cookies (Google Ads)"
              />
              <span className="cookie-switch-track" aria-hidden="true">
                <span className="cookie-switch-thumb" />
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="cookie-actions">
        <button
          type="button"
          className="cookie-btn"
          onClick={handleRejectAll}
        >
          Alle ablehnen
        </button>
        {showSettings ? (
          <button type="button" className="cookie-btn" onClick={handleSave}>
            Auswahl speichern
          </button>
        ) : (
          <button
            type="button"
            className="cookie-btn"
            onClick={() => setShowSettings(true)}
          >
            Einstellungen
          </button>
        )}
        <button
          type="button"
          className="cookie-btn cookie-btn--primary"
          onClick={handleAcceptAll}
        >
          Alle akzeptieren
        </button>
      </div>
    </div>
  );
}

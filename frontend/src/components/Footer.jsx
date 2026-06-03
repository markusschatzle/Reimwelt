import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-copy">
          © {new Date().getFullYear()} Reimwelt
        </span>
        <nav className="footer-nav" aria-label="Rechtliches">
          <Link to="/impressum" className="footer-link">
            Impressum
          </Link>
          <Link to="/datenschutz" className="footer-link">
            Datenschutz
          </Link>
          <button
            type="button"
            className="footer-link footer-link--button"
            onClick={() =>
              window.dispatchEvent(new Event("open-cookie-settings"))
            }
          >
            Cookie-Einstellungen
          </button>
        </nav>
      </div>
    </footer>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import LogoSrc from "../icons/Logo.svg";

const WISSEN_LINKS = [
  { to: "/wissenswelt/reimen", label: "Was ist ein Reim?" },
  { to: "/wissenswelt/homographe", label: "Homographe" },
  { to: "/wissenswelt/metrum", label: "Metrum & Rhythmus" },
  { to: "/wissenswelt/ipa", label: "IPA – Lautschrift" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [wissenOpen, setWissenOpen] = useState(false);
  const [wissenClosing, setWissenClosing] = useState(false);
  const drawerRef = useRef(null);
  const burgerRef = useRef(null);
  const wissenRef = useRef(null);
  const wissenCloseTimer = useRef(null);
  const wissenAnimTimer = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e) {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target) &&
        burgerRef.current &&
        !burgerRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleWissenEnter() {
    if (wissenCloseTimer.current) clearTimeout(wissenCloseTimer.current);
    if (wissenAnimTimer.current) clearTimeout(wissenAnimTimer.current);
    setWissenClosing(false);
    setWissenOpen(true);
  }

  function handleWissenLeave() {
    wissenCloseTimer.current = setTimeout(() => {
      setWissenClosing(true);
      wissenAnimTimer.current = setTimeout(() => {
        setWissenOpen(false);
        setWissenClosing(false);
      }, 180);
    }, 80);
  }

  function closeWissen() {
    if (wissenCloseTimer.current) clearTimeout(wissenCloseTimer.current);
    if (wissenAnimTimer.current) clearTimeout(wissenAnimTimer.current);
    setWissenOpen(false);
    setWissenClosing(false);
  }

  return (
    <header className="header">
      <div className="logo">Reimwelt.de</div>

      {/* Desktop nav */}
      <nav className="header-nav" aria-label="Hauptnavigation">
        <NavLink
          to="/reime"
          className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
        >
          Reime
        </NavLink>
        <NavLink
          to="/endungen"
          className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
        >
          Endungen
        </NavLink>

        {/* Wissenswelt dropdown */}
        <div
          className="nav-dropdown-wrap"
          ref={wissenRef}
          onMouseEnter={handleWissenEnter}
          onMouseLeave={handleWissenLeave}
        >
          <NavLink
            to="/wissenswelt"
            className={({ isActive }) =>
              "nav-link" + (isActive ? " active" : "")
            }
            onClick={closeWissen}
          >
            Wissenswelt
          </NavLink>
          {wissenOpen && (
            <div
              className={`nav-dropdown-panel${wissenClosing ? " closing" : ""}`}
              onMouseEnter={handleWissenEnter}
              onMouseLeave={handleWissenLeave}
            >
              {WISSEN_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    "nav-dropdown-link" + (isActive ? " active" : "")
                  }
                  onClick={closeWissen}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Burger button (mobile only) */}
      <div className="header-right">
        <ThemeToggle className="theme-toggle--desktop" />
        <button
          ref={burgerRef}
          className={`burger-btn${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menü öffnen"
          aria-expanded={menuOpen}
          type="button"
        >
          <span className="burger-line" />
          <span className="burger-line" />
          <span className="burger-line" />
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div
            className="mobile-nav-overlay"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div className="mobile-nav-drawer" ref={drawerRef}>
            <NavLink
              to="/reime"
              className={({ isActive }) =>
                "mobile-nav-link" + (isActive ? " active" : "")
              }
              onClick={closeMenu}
            >
              Reime
            </NavLink>
            <NavLink
              to="/endungen"
              className={({ isActive }) =>
                "mobile-nav-link" + (isActive ? " active" : "")
              }
              onClick={closeMenu}
            >
              Endungen
            </NavLink>
            <NavLink
              to="/wissenswelt"
              className={({ isActive }) =>
                "mobile-nav-link" + (isActive ? " active" : "")
              }
              onClick={closeMenu}
            >
              Wissenswelt
            </NavLink>
            {WISSEN_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  "mobile-nav-sublink" + (isActive ? " active" : "")
                }
                onClick={closeMenu}
              >
                {l.label}
              </NavLink>
            ))}
            <div className="mobile-nav-theme-row">
              <span className="mobile-nav-theme-label">Erscheinungsbild</span>
              <ThemeToggle />
            </div>
          </div>
        </>
      )}
    </header>
  );
}

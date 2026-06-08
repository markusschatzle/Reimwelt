import Link from "next/link";
import { DEFAULT_LOCALE, ROUTE_SEGMENTS } from "../src/routes.js";

export const metadata = {
  title: "Seite nicht gefunden",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="main-content">
      <div className="app" style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          404 – Nicht gefunden
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          Diese Seite existiert nicht.
        </p>
        <Link
          className="pill"
          href={`/${DEFAULT_LOCALE}/${ROUTE_SEGMENTS[DEFAULT_LOCALE]}`}
        >
          Zur Reimsuche
        </Link>
      </div>
    </main>
  );
}

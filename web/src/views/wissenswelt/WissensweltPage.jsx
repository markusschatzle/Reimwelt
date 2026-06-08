"use client";

import React from "react";
import { Link } from "../../router.jsx";
import { WissenToc } from "./_widgets.jsx";
const reimIcon = "/icons/Reim.svg";
const homographIcon = "/icons/Homograph.svg";
const metrumIcon = "/icons/Metrum.svg";
const ipaIcon = "/icons/IPA.svg";

// Table-of-contents entries — `id` matches the matching <h2 id> below.
const SECTIONS = [
  { id: "wie-es-funktioniert", label: "Wie es funktioniert" },
  { id: "die-daten", label: "Die Daten" },
  { id: "was-reimwelt-kann", label: "Was Reimwelt kann" },
  { id: "grenzen", label: "Grenzen & Schwächen" },
];

export default function WissensweltPage() {
  return (
    <div className="wissen-layout">
      <WissenToc sections={SECTIONS} />
      <div className="wissen-page">
        <header className="wissen-hero">
          <span className="wissen-kicker">Reimwelt · Handbuch</span>
          <h1>Wissenswelt</h1>
          <p className="wissen-lead">
            Wie Reimwelt unter der Haube tickt – und alles, was du über Reime,
            Rhythmus und Lautschrift wissen wolltest, ohne je ein
            Phonetikseminar besucht zu haben.
          </p>
        </header>

        {/* ── Wie es funktioniert ── */}
        <h2 id="wie-es-funktioniert">Wie es funktioniert</h2>
        <p>
          Reimwelt sucht keine Textübereinstimmungen. Stattdessen vergleicht die
          App Wörter auf <strong>Lautebene</strong>: Für jedes Wort in der
          Datenbank ist eine IPA-Transkription hinterlegt. Aus dieser wird der{" "}
          <strong>Reimteil</strong> extrahiert – also alles ab dem letzten
          betonten Vokal bis zum Wortende.
        </p>
        <p>
          Anschließend berechnet die Engine einen{" "}
          <strong>Reimreinheitsgrad</strong> (0–1) zwischen zwei Wörtern, indem
          sie die Lautdistanz ihrer Reimteile misst. Ein Wert von 1,0 bedeutet
          perfekten Gleichklang, niedrigere Werte erlauben auch ähnliche, aber
          nicht identische Laute – was besonders für sprachübergreifende Reime
          wichtig ist.
        </p>
        <p>
          Die Ergebnisse werden nach vier Kriterien sortierbar gemacht:
          alphabetisch, nach Reimreinheit, nach Wortfrequenz (Wie gebräuchlich
          ein Wort ist) oder nach einer ausgewogenen Kombination beider Werte.
        </p>

        {/* ── Die Daten ── */}
        <h2 id="die-daten">Die Daten</h2>
        <p>
          Die Datenbank enthält mehrere hunderttausend Wörter aus Deutsch und
          Englisch. Die Einbindung von weiteren Sprachen ist geplant. Die
          Grundlage bildet <strong>Wiktionary</strong> – ein freies
          kollaboratives Wörterbuch – ergänzt um Frequenzdaten aus Textkorpora
          (Untertitel, Webtext) und Informationen zu Wortform, Flexion und
          Wortart.
        </p>
        <p>
          Die IPA-Transkriptionen stammen aus zwei Quellen: Wo Wiktionary eine
          manuell eingetragene Aussprache enthält, wird diese verwendet. Für
          Wörter ohne Eintrag generiert das Open-Source-Tool{" "}
          <strong>espeak-ng</strong> automatisch eine IPA-Schreibung. Diese
          automatisch erzeugten Transkriptionen sind in der Regel gut, können
          aber bei seltenen, fremdsprachigen oder unregelmäßigen Wörtern ungenau
          sein.
        </p>

        {/* ── Was Reimwelt kann ── */}
        <h2 id="was-reimwelt-kann">Was Reimwelt kann</h2>
        <ul>
          <li>
            <strong>Sprachübergreifende Reime</strong> – z. B. deutsches Wort
            mit englischem Pendant
          </li>
          <li>
            <strong>Filterung nach Silbenzahl</strong>, Wortart (Nomen, Verb,
            Adjektiv …) und Metrum (Jambus, Trochäus …)
          </li>
          <li>
            <strong>Vier Sortiermodi</strong>: Ausgewogen, Reimreinheit,
            Häufigkeit und alphabetisch
          </li>
          <li>
            <strong>Wortdetails</strong> auf Knopfdruck: IPA, Betonungsmuster,
            Flexionsformen, Synonyme
          </li>
          <li>
            <strong>Endungssuche</strong> – alle Wörter auf <em>-heit</em>,{" "}
            <em>-ung</em> usw. finden
          </li>
        </ul>

        {/* ── Grenzen & Schwächen ── */}
        <h2 id="grenzen">Grenzen &amp; Schwächen</h2>
        <p>
          Reimwelt ist ein Werkzeug, kein Orakel. Es gibt einige strukturelle
          Einschränkungen, die du kennen solltest:
        </p>

        <h3>Homographe</h3>
        <p>
          Manche deutschen Wörter werden je nach Bedeutung unterschiedlich
          betont und ausgesprochen – zum Beispiel <em>„modern"</em> als Adjektiv
          [moˈdɛʁn] vs. als Verb [ˈmoːdɐn] (modern = verrotten). Die Datenbank
          kann nur <em>eine</em> Aussprache pro Wort speichern; die andere geht
          verloren.
        </p>

        <h3>IPA-Ungenauigkeiten</h3>
        <p>
          Automatisch erzeugte Transkriptionen sind nicht perfekt. Bei
          Fremdwörtern, Eigennamen oder seltenen Wörtern kann die IPA-Schreibung
          von der tatsächlichen Aussprache abweichen, was zu falschen Treffern
          oder fehlenden Reimen führt.
        </p>

        <h3>Fehlende Frequenzdaten</h3>
        <p>
          Für sehr seltene, veraltete oder stark fachsprachliche Wörter fehlen
          verlässliche Häufigkeitswerte. Solche Wörter erhalten einen
          Standardwert und können im Sortiermodus „Häufigkeit" nach unten
          rutschen.
        </p>

        <h3>Keine semantische Ebene</h3>
        <p>
          Reimwelt ist Phonetiker, nicht Poet: Es weiß, wie Wörter klingen, aber
          nicht, was sie bedeuten. <em>„schön"</em> und <em>„Gestöhn"</em>{" "}
          reimen sich lautlich einwandfrei – ob das inhaltlich eine gute Idee
          ist, liegt ganz allein bei dir.
        </p>

        <div className="wissen-callout">
          <p>
            <strong>Tipp:</strong> Stößt du auf einen offensichtlichen
            IPA-Fehler oder ein fehlendes Reim-Paar? Homographe und
            Transkriptionsfehler sind die häufigsten Ursachen. Die{" "}
            <Link to="/wissenswelt/homographe">Homographe-Seite</Link> erklärt
            das Problem ausführlicher.
          </p>
        </div>

        {/* ── Karten ── */}
        <div className="wissen-section-divider">
          <span className="wissen-section-divider-label">
            Tiefer eintauchen
          </span>
        </div>

        <div className="wissen-cards-grid">
          <Link to="/wissenswelt/reimen" className="wissen-card">
            <span className="wissen-card-icon" aria-hidden="true">
              <img src={reimIcon} alt="" />
            </span>
            <span className="wissen-card-title">Was ist ein Reim?</span>
            <span className="wissen-card-desc">
              Von reinen und unreinen Reimen über Reimschemata bis zu den
              Grundlagen des Gleichklangs.
            </span>
          </Link>

          <Link to="/wissenswelt/homographe" className="wissen-card">
            <span className="wissen-card-icon" aria-hidden="true">
              <img src={homographIcon} alt="" />
            </span>
            <span className="wissen-card-title">Homographe</span>
            <span className="wissen-card-desc">
              Gleiche Schreibung, verschiedene Aussprache – wie solche Wörter
              die Reimsuche beeinflussen.
            </span>
          </Link>

          <Link to="/wissenswelt/metrum" className="wissen-card">
            <span className="wissen-card-icon" aria-hidden="true">
              <img src={metrumIcon} alt="" style={{ height: "1.1rem" }} />
            </span>
            <span className="wissen-card-title">Metrum &amp; Rhythmus</span>
            <span className="wissen-card-desc">
              Jambus, Trochäus, Daktylus – die Versfüße der deutschen Dichtung,
              visuell erklärt.
            </span>
          </Link>

          <Link to="/wissenswelt/ipa" className="wissen-card">
            <span className="wissen-card-icon" aria-hidden="true">
              <img src={ipaIcon} alt="" />
            </span>
            <span className="wissen-card-title">IPA – Lautschrift</span>
            <span className="wissen-card-desc">
              Was bedeuten die Zeichen in Reimwelt? Eine Einführung ins
              Internationale Phonetische Alphabet.
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

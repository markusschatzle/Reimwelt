import React from "react";
import { Link } from "react-router-dom";

// ---------------------------------------------------------------------------
// Animated meter line
// ---------------------------------------------------------------------------

function MeterLine({ syllables }) {
  return (
    <div className="meter-line">
      {syllables.map(({ text, stressed }, i) => (
        <div
          key={i}
          className={`meter-syllable ${stressed ? "stressed" : "unstressed"}`}
          style={stressed ? { animationDelay: `${i * 0.2}s` } : undefined}
        >
          <span className="meter-stress-mark">{stressed ? "ˈ" : "·"}</span>
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MetrumPage() {
  return (
    <div className="wissen-page">
      <Link to="/wissenswelt" className="wissen-breadcrumb">
        ← Wissenswelt
      </Link>

      <h1>Metrum &amp; Rhythmus</h1>
      <p className="wissen-subtitle">
        Die Grundeinheiten des Versrhythmus – vier klassische Versfüße, visuell
        und mit animierten Betonungsmustern.
      </p>

      {/* ── Was ist Metrum? ── */}
      <h2>Was ist Metrum?</h2>
      <p>
        Das <strong>Metrum</strong> (auch: Versmaß) beschreibt das regelmäßige
        Betonungsmuster in einem Vers oder Songtext. Es entsteht durch die
        Abfolge von <strong>betonten</strong> (ˈ) und{" "}
        <strong>unbetonten</strong> (·) Silben.
      </p>
      <p>
        Die kleinste rhythmische Einheit heißt <strong>Versfuß</strong>.
        Kombiniert man mehrere Versfüße hintereinander, ergibt sich ein
        vollständiger Vers. Ein Vers mit vier Jamben heißt zum Beispiel
        „vierhebiger Jambus" – das klassische Maß von Shakespeares Sonetten und
        Schillers Balladen.
      </p>
      <p>
        Reimwelt erkennt das Metrum jedes Wortes automatisch aus seinem
        Betonungsmuster und zeigt es im Detailpanel. Über den Filter in der
        Suchleiste kannst du Ergebnisse auf ein bestimmtes Versmaß einschränken.
      </p>

      {/* ── Vier Versfüße ── */}
      <h2>Die vier klassischen Versfüße</h2>

      {/* Jambus */}
      <div className="meter-foot-section">
        <div className="meter-foot-header">
          <span className="meter-foot-name">Jambus</span>
          <span className="meter-foot-schema">· ˈ · ˈ · ˈ · ˈ</span>
        </div>
        <MeterLine
          syllables={[
            { text: "ich", stressed: false },
            { text: "wand", stressed: true },
            { text: "re", stressed: false },
            { text: "durch", stressed: true },
            { text: "die", stressed: false },
            { text: "Wel", stressed: true },
            { text: "ten", stressed: false },
            { text: "weit", stressed: true },
          ]}
        />
        <p className="meter-example-line">
          „Ich wandre durch die Welten weit …"
        </p>
        <p>
          Der Jambus beginnt unbetont und endet betont – er klingt
          vorwärtsgerichtet und natürlich. Er ist das häufigste Versmaß in der
          deutschen Dichtung und kommt auch in vielen Songtexten unbewusst vor.
        </p>
      </div>

      {/* Trochäus */}
      <div className="meter-foot-section">
        <div className="meter-foot-header">
          <span className="meter-foot-name">Trochäus</span>
          <span className="meter-foot-schema">ˈ · ˈ · ˈ · ˈ ·</span>
        </div>
        <MeterLine
          syllables={[
            { text: "Ro", stressed: true },
            { text: "sen", stressed: false },
            { text: "blühn", stressed: true },
            { text: "im", stressed: false },
            { text: "Mor", stressed: true },
            { text: "gen", stressed: false },
            { text: "rot", stressed: true },
            { text: "en", stressed: false },
          ]}
        />
        <p className="meter-example-line">„Rosenblühn im Morgenroten …"</p>
        <p>
          Der Trochäus ist das Gegenstück zum Jambus: betont-unbetont. Er wirkt
          entschlossen, fallend, manchmal erdig. Viele deutschen Volkslieder und
          Kinderreime sind trochäisch.
        </p>
      </div>

      {/* Daktylus */}
      <div className="meter-foot-section">
        <div className="meter-foot-header">
          <span className="meter-foot-name">Daktylus</span>
          <span className="meter-foot-schema">ˈ · · ˈ · · ˈ · ·</span>
        </div>
        <MeterLine
          syllables={[
            { text: "Kö", stressed: true },
            { text: "ni", stressed: false },
            { text: "ge", stressed: false },
            { text: "Hel", stressed: true },
            { text: "den", stressed: false },
            { text: "und", stressed: false },
            { text: "Göt", stressed: true },
            { text: "ter", stressed: false },
          ]}
        />
        <p className="meter-example-line">„Könige, Helden und Götter …"</p>
        <p>
          Der Daktylus hat eine betonte und zwei unbetonte Silben – wie ein
          Herzschlag mit Echo. Er klingt tänzerisch und fließend und findet sich
          in Walzerliedern, Hymnen und antiken Hexametern.
        </p>
      </div>

      {/* Anapäst */}
      <div className="meter-foot-section">
        <div className="meter-foot-header">
          <span className="meter-foot-name">Anapäst</span>
          <span className="meter-foot-schema">· · ˈ · · ˈ · · ˈ</span>
        </div>
        <MeterLine
          syllables={[
            { text: "in", stressed: false },
            { text: "dem", stressed: false },
            { text: "Wald", stressed: true },
            { text: "an", stressed: false },
            { text: "dem", stressed: false },
            { text: "Bach", stressed: true },
            { text: "ü", stressed: false },
            { text: "ber", stressed: false },
            { text: "Nach", stressed: true },
          ]}
        />
        <p className="meter-example-line">
          „in dem Wald, an dem Bach über Nacht …"
        </p>
        <p>
          Der Anapäst ist das Spiegelbild des Daktylus: zwei unbetonte Silben
          führen zur Betonung hin. Er klingt anrollend und drängend – ideal für
          Marschrhythmen und dramatische Wendungen.
        </p>
      </div>

      {/* ── Metrum in Reimwelt ── */}
      <h2>Metrum in Reimwelt</h2>
      <p>
        Im <strong>Detailpanel</strong> jedes Wortes (Klick auf das ⓘ-Symbol)
        siehst du das Betonungsmuster als Punkte dargestellt: ein gefüllter
        Kreis steht für eine betonte Silbe, ein leerer Kreis für eine unbetonte.
        Daraus lässt sich direkt ablesen, welchem Versfuß das Wort entspricht.
      </p>
      <p>
        Im <strong>Metrum-Filter</strong> der Suchoberfläche kannst du
        Ergebnisse auf einen bestimmten Versfuß einschränken – zum Beispiel nur
        Trochäen oder nur dreisilbige Daktylen.
      </p>

      {/* ── CTA ── */}
      <div className="wissen-cta-row">
        <Link to="/reime" className="wissen-cta-btn">
          Reime nach Metrum filtern →
        </Link>
      </div>

      {/* ── Siehe auch ── */}
      <div className="wissen-also">
        <p className="wissen-also-title">Siehe auch</p>
        <div className="wissen-also-links">
          <Link to="/wissenswelt/reimen" className="wissen-also-link">
            🎵 Was ist ein Reim?
          </Link>
          <Link to="/wissenswelt/ipa" className="wissen-also-link">
            🔊 IPA – Lautschrift
          </Link>
          <Link to="/wissenswelt" className="wissen-also-link">
            ← Wissenswelt
          </Link>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";

export default function ReimenPage() {
  return (
    <div className="wissen-page">
      <Link to="/wissenswelt" className="wissen-breadcrumb">
        ← Wissenswelt
      </Link>

      <h1>Was ist ein Reim?</h1>
      <p className="wissen-subtitle">
        Die Grundlagen des Gleichklangs – von der Definition über Reimarten bis
        zu klassischen Schemata.
      </p>

      {/* ── Definition ── */}
      <h2>Definition</h2>
      <p>
        Ein Reim entsteht, wenn zwei Wörter oder Versenden ab dem letzten{" "}
        <strong>betonten Vokal</strong> gleich oder sehr ähnlich klingen. Alles
        davor – der sogenannte <em>Anlaut</em> – darf verschieden sein.
      </p>
      <p>
        Das Wort <em>„Stein"</em> [ʃtaɪ̯n] und <em>„Wein"</em> [vaɪ̯n] reimen
        sich, weil beide ab dem Vokal <em>aɪ̯</em> identisch klingen. Der Anlaut
        (<em>ʃt-</em> vs. <em>v-</em>) ist verschieden – genau das macht es zum
        Reim und nicht zur Wiederholung.
      </p>
      <p>
        Reimwelt arbeitet auf dieser Lautebene: Nicht die Buchstaben, sondern
        die IPA-Zeichen entscheiden darüber, ob zwei Wörter reimen.
      </p>

      {/* ── Reimarten ── */}
      <h2>Reimarten</h2>

      <h3>Reiner Reim</h3>
      <p>
        Die Laute ab dem betonten Vokal sind identisch. Der klassische, saubere
        Gleichklang.
      </p>
      <div className="wissen-examples">
        <div className="wissen-example-row">
          <span className="wissen-example-word">Stein / Wein</span>
          <span className="wissen-example-ipa">[aɪ̯n] / [aɪ̯n]</span>
          <span className="wissen-example-gloss">identischer Reimteil</span>
        </div>
        <div className="wissen-example-row">
          <span className="wissen-example-word">Licht / Gedicht</span>
          <span className="wissen-example-ipa">[lɪçt] / [ɡədɪçt]</span>
          <span className="wissen-example-gloss">-ɪçt stimmt überein</span>
        </div>
        <div className="wissen-example-row">
          <span className="wissen-example-word">Traum / Raum</span>
          <span className="wissen-example-ipa">[tʁaʊ̯m] / [ʁaʊ̯m]</span>
          <span className="wissen-example-gloss">-aʊ̯m stimmt überein</span>
        </div>
      </div>

      <h3>Unreiner Reim</h3>
      <p>
        Die Laute sind ähnlich, aber nicht vollständig identisch. Solche Reime
        sind in Lyrik sehr gebräuchlich und klingen natürlicher als erzwungene
        reine Reime.
      </p>
      <div className="wissen-examples">
        <div className="wissen-example-row">
          <span className="wissen-example-word">Gott / Not</span>
          <span className="wissen-example-ipa">[ɡɔt] / [noːt]</span>
          <span className="wissen-example-gloss">
            ɔ ≈ oː (ähnlich, nicht gleich)
          </span>
        </div>
        <div className="wissen-example-row">
          <span className="wissen-example-word">Herz / Schmerz</span>
          <span className="wissen-example-ipa">[hɛʁts] / [ʃmɛʁts]</span>
          <span className="wissen-example-gloss">
            reiner Reim, oft als unrund empfunden
          </span>
        </div>
        <div className="wissen-example-row">
          <span className="wissen-example-word">Seele / Höhle</span>
          <span className="wissen-example-ipa">[ˈzeːlə] / [ˈhøːlə]</span>
          <span className="wissen-example-gloss">
            eː ≈ øː (ähnliche Zungenstellung)
          </span>
        </div>
      </div>

      <h3>Reicher Reim</h3>
      <p>
        Der Gleichklang beginnt bereits <em>vor</em> dem betonten Vokal, also
        auch der Anlaut stimmt überein. Reiche Reime klingen besonders
        eindringlich, wirken aber leicht gekünstelt.
      </p>
      <div className="wissen-examples">
        <div className="wissen-example-row">
          <span className="wissen-example-word">Lachen / Krachen</span>
          <span className="wissen-example-ipa">[ˈlaxən] / [ˈkʁaxən]</span>
          <span className="wissen-example-gloss">
            -axən mit Anlautähnlichkeit
          </span>
        </div>
        <div className="wissen-example-row">
          <span className="wissen-example-word">Blüte / Güte</span>
          <span className="wissen-example-ipa">[ˈblyːtə] / [ˈɡyːtə]</span>
          <span className="wissen-example-gloss">-yːtə vollständig gleich</span>
        </div>
      </div>

      <h3>Augenreim</h3>
      <p>
        Wörter, die sich im Schriftbild reimen, aber phonetisch nicht
        übereinstimmen. Im Deutschen relativ selten; im Englischen häufiger (z.
        B. <em>„love / move"</em> [lʌv] / [muːv] – <em>Englisch</em>).
      </p>
      <p>
        Da Reimwelt auf Lautebene arbeitet, werden Augenreime{" "}
        <strong>nicht als Reime gewertet</strong>. Das ist ein Feature, kein
        Bug: Ein Gleichklang, der sich nur liest, aber nicht hört, ist kein
        Reim.
      </p>

      {/* ── Reimschemata ── */}
      <h2>Reimschemata</h2>
      <p>
        Reimschemata beschreiben, wie die Reime in einem Gedicht oder Songtext
        angeordnet sind. Jeder Buchstabe steht für einen neuen Reim.
      </p>

      <h3>Paarreim (AABB)</h3>
      <p>Je zwei aufeinanderfolgende Zeilen reimen sich.</p>
      <div className="wissen-schema-block">
        Es war einmal ein König fein,{" "}
        <span className="wissen-schema-label">A</span>
        <br />
        der liebte sehr den Sonnenschein.{" "}
        <span className="wissen-schema-label">A</span>
        <br />
        Sein Schloss stand hoch auf grünem Hang,{" "}
        <span className="wissen-schema-label">B</span>
        <br />
        doch sommers war dem Fürsten bang.{" "}
        <span className="wissen-schema-label">B</span>
      </div>

      <h3>Kreuzreim (ABAB)</h3>
      <p>Gerade und ungerade Zeilen reimen sich abwechselnd.</p>
      <div className="wissen-schema-block">
        Ich wandre durch die stille Nacht,{" "}
        <span className="wissen-schema-label">A</span>
        <br />
        der Mond scheint hell und klar.{" "}
        <span className="wissen-schema-label">B</span>
        <br />
        Ein Lied, das niemand je gedacht,{" "}
        <span className="wissen-schema-label">A</span>
        <br />
        klingt mir aus ferner Jahr.{" "}
        <span className="wissen-schema-label">B</span>
      </div>

      <h3>Umarmender Reim (ABBA)</h3>
      <p>
        Die erste und vierte Zeile reimen sich, ebenso die zweite und dritte –
        ein „eingerahmter" Reim.
      </p>
      <div className="wissen-schema-block">
        Die Rosen blühn im Morgentau,{" "}
        <span className="wissen-schema-label">A</span>
        <br />
        ihr Duft schwebt durch die Luft so leis.{" "}
        <span className="wissen-schema-label">B</span>
        <br />
        Im Garten liegt noch weißer Eis,{" "}
        <span className="wissen-schema-label">B</span>
        <br />
        der Himmel strahlt in tiefem Blau.{" "}
        <span className="wissen-schema-label">A</span>
      </div>

      {/* ── CTA ── */}
      <div className="wissen-cta-row">
        <Link to="/reime" className="wissen-cta-btn">
          Reime suchen →
        </Link>
      </div>

      {/* ── Siehe auch ── */}
      <div className="wissen-also">
        <p className="wissen-also-title">Siehe auch</p>
        <div className="wissen-also-links">
          <Link to="/wissenswelt/metrum" className="wissen-also-link">
            🎼 Metrum &amp; Rhythmus
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

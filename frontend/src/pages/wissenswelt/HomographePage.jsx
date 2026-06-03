import React from "react";
import { Link } from "react-router-dom";

export default function HomographePage() {
  return (
    <div className="wissen-page">
      <Link to="/wissenswelt" className="wissen-breadcrumb">
        ← Wissenswelt
      </Link>

      <h1>Homographe</h1>
      <p className="wissen-subtitle">
        Gleiche Schreibung, verschiedene Aussprache – und warum das die
        Reimsuche vor echte Probleme stellt.
      </p>

      {/* ── Definition ── */}
      <h2>Was sind Homographe?</h2>
      <p>
        Als <strong>Homographe</strong> bezeichnet man Wörter, die identisch
        geschrieben werden, aber je nach Bedeutung oder Wortart unterschiedlich
        ausgesprochen werden. Der Unterschied liegt oft in der{" "}
        <strong>Betonung</strong>: Ein anderer Akzent verschiebt den Reimteil
        und verändert damit, welche anderen Wörter als Reim infrage kommen.
      </p>

      {/* ── Beispiele ── */}
      <h2>Beispiele aus dem Deutschen</h2>

      <h3>modern</h3>
      <div className="wissen-examples">
        <div className="wissen-example-row">
          <span className="wissen-example-word">modern (Adj.)</span>
          <span className="wissen-example-ipa">[moˈdɛʁn]</span>
          <span className="wissen-example-gloss">zeitgemäß, aktuell</span>
        </div>
        <div className="wissen-example-row">
          <span className="wissen-example-word">modern (Verb)</span>
          <span className="wissen-example-ipa">[ˈmoːdɐn]</span>
          <span className="wissen-example-gloss">verwesen, verrotten</span>
        </div>
      </div>
      <p>
        Als Adjektiv betont auf der zweiten Silbe: Reimteil ist <em>-dɛʁn</em> →
        reimt auf <em>intern, extern, Kern</em>. Als Verb betont auf der ersten
        Silbe: Reimteil ist <em>-moːdɐn</em> → reimt auf{" "}
        <em>lodern, fodern, odern</em>.
      </p>

      <h3>Tenor</h3>
      <div className="wissen-examples">
        <div className="wissen-example-row">
          <span className="wissen-example-word">Tenor (Inhalt)</span>
          <span className="wissen-example-ipa">[ˈteːnoʁ]</span>
          <span className="wissen-example-gloss">
            Grundaussage, Sinngehalt eines Textes
          </span>
        </div>
        <div className="wissen-example-row">
          <span className="wissen-example-word">Tenor (Sänger)</span>
          <span className="wissen-example-ipa">[teˈnoːɐ̯]</span>
          <span className="wissen-example-gloss">hohe Männerstimme</span>
        </div>
      </div>
      <p>
        Der Inhalt-„Tenor" reimt auf <em>Humor, Major, Minor</em> (Betonung
        vorne). Der Sänger-„Tenor" reimt auf <em>Büro, Bistro, Métro</em>{" "}
        (Betonung hinten).
      </p>

      <h3>übersetzen</h3>
      <div className="wissen-examples">
        <div className="wissen-example-row">
          <span className="wissen-example-word">übersetzen (trennbar)</span>
          <span className="wissen-example-ipa">[ˈyːbɐˌzɛtsn̩]</span>
          <span className="wissen-example-gloss">
            mit einem Boot ans andere Ufer bringen
          </span>
        </div>
        <div className="wissen-example-row">
          <span className="wissen-example-word">übersetzen (untrennbar)</span>
          <span className="wissen-example-ipa">[yːbɐˈzɛtsn̩]</span>
          <span className="wissen-example-gloss">
            in eine andere Sprache übertragen
          </span>
        </div>
      </div>
      <p>
        Bei beiden liegt der Reimteil auf <em>-zɛtsn̩</em> – ein seltener Fall,
        bei dem beide Varianten des Homographen auf dieselben Wörter reimen.
        Trotzdem hat die Datenbank nur einen Eintrag.
      </p>

      {/* ── Auswirkung ── */}
      <h2>Auswirkung auf die Reimsuche</h2>
      <p>
        Reimwelt kann pro Wort nur <strong>eine IPA-Transkription</strong>{" "}
        speichern. Bei Homographen wird in der Regel die häufigere oder in
        Wiktionary zuerst eingetragene Aussprache verwendet. Die andere Variante
        fehlt.
      </p>
      <p>
        Das bedeutet in der Praxis: Suchst du nach Reimen auf <em>„modern"</em>{" "}
        in seiner verbalen Bedeutung (verrotten), findest du möglicherweise
        trotzdem die Reimgruppe des Adjektivs – oder umgekehrt.
      </p>

      <div className="wissen-callout">
        <p>
          <strong>Workaround:</strong> Wenn du vermutest, dass ein Wort ein
          Homograph ist, suche direkt nach einem anderen Wort aus der
          gewünschten Reimgruppe. Gibst du zum Beispiel <em>„intern"</em> ein
          statt <em>„modern"</em>, erhältst du zuverlässig alle Wörter auf{" "}
          <em>-dɛʁn</em>.
        </p>
      </div>

      {/* ── Erkennungsmerkmale ── */}
      <h2>Woran erkennst du ein Homograph?</h2>
      <ul>
        <li>
          Das gesuchte Wort hat zwei klar verschiedene{" "}
          <strong>Bedeutungen</strong> oder Wortarten (z. B. Verb und Adjektiv).
        </li>
        <li>
          Die Ergebnisse in Reimwelt wirken <strong>„falsch"</strong> – die
          gefundenen Reime passen nicht zu der Aussprache, die du im Kopf hast.
        </li>
        <li>
          Im <strong>Detailpanel</strong> (Klick auf das ⓘ-Symbol bei einem
          Treffer) siehst du die gespeicherte IPA. Stimmt sie nicht mit deiner
          Aussprache überein, liegt ein Homograph vor.
        </li>
      </ul>

      {/* ── IPA-Verbindung ── */}
      <h2>Zusammenhang mit IPA-Fehlern</h2>
      <p>
        Homographe sind eine der häufigsten Ursachen für überraschende
        Ergebnisse – aber nicht die einzige. Automatisch generierte
        IPA-Transkriptionen können auch bei eindeutigen Wörtern falsch sein,
        besonders bei Fremdwörtern oder Komposita. Der Unterschied: Bei einem
        IPA-Fehler gibt es <em>eine</em> korrekte Aussprache, die falsch kodiert
        ist. Beim Homographen gibt es <em>zwei</em> korrekte Aussprachen.
      </p>

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

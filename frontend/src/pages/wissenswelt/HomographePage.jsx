import React from "react";
import { Link } from "react-router-dom";
import { MeterDots, InfoIcon, WissenToc } from "./_widgets.jsx";

// Table-of-contents entries — `id` matches the matching <h2 id> below.
const SECTIONS = [
  { id: "was-sind-homographe", label: "Was sind Homographe?" },
  { id: "beispiele", label: "Beispiele aus dem Deutschen" },
  { id: "auswirkung", label: "Auswirkung auf die Reimsuche" },
  { id: "erkennen", label: "Woran erkennst du eins?" },
  { id: "ipa-fehler", label: "Zusammenhang mit IPA-Fehlern" },
];

// One reading of a homograph: word + reading label, IPA, meter dots, gloss.
function Reading({ word, tag, ipa, pattern, gloss }) {
  return (
    <div className="wissen-example-row">
      <span className="wissen-example-word">
        {word}
        <span className="wissen-example-tag">{tag}</span>
      </span>
      <span className="wissen-example-ipa">{ipa}</span>
      <span className="wissen-example-meter">
        <MeterDots pattern={pattern} label={`${word} (${tag})`} />
      </span>
      <span className="wissen-example-gloss">{gloss}</span>
    </div>
  );
}

export default function HomographePage() {
  return (
    <div className="wissen-layout">
      <WissenToc sections={SECTIONS} />
      <div className="wissen-page">
        <header className="wissen-hero">
          <Link to="/wissenswelt" className="wissen-breadcrumb">
            ← Wissenswelt
          </Link>
          <span className="wissen-kicker">Wissenswelt · Stolpersteine</span>
          <h1>Homographe</h1>
          <p className="wissen-lead">
            Ein Wort, zwei Aussprachen: die linguistischen Doppelgänger, die
            gleich aussehen, aber verschieden klingen – und der Reimsuche damit
            gehörig auf der Nase herumtanzen.
          </p>
        </header>

        {/* ── Definition ── */}
        <h2 id="was-sind-homographe">Was sind Homographe?</h2>
        <p>
          Homographe sind Wörter, die identisch geschrieben, aber je nach
          Bedeutung verschieden ausgesprochen werden.
        </p>
        <p>
          Der Unterschied liegt oft in der <strong>Betonung</strong>: Ein
          anderer Akzent verschiebt den Reimteil – und damit die komplette Liste
          an Wörtern, die als Reim infrage kommen. Im Schriftbild ist davon
          nichts zu sehen; man hört es erst, wenn man genau hinhört (oder die
          Kreise unten vergleicht).
        </p>

        {/* ── Beispiele ── */}
        <h2 id="beispiele">Beispiele aus dem Deutschen</h2>
        <p>
          Gefüllter Kreis = betonte Silbe. Schon ein verschobener Punkt schickt
          die beiden Lesarten in völlig verschiedene Reimgruppen.
        </p>

        <h3>modern</h3>
        <div className="wissen-examples">
          <Reading
            word="modern"
            tag="Adjektiv"
            ipa="[moˈdɛʁn]"
            pattern="01"
            gloss="zeitgemäß, aktuell"
          />
          <Reading
            word="modern"
            tag="Verb"
            ipa="[ˈmoːdɐn]"
            pattern="10"
            gloss="verwesen, verrotten"
          />
        </div>
        <p>
          Als Adjektiv betont auf der zweiten Silbe: Reimteil <em>-dɛʁn</em> →
          reimt auf <em>intern, extern, Kern</em>. Als Verb betont auf der
          ersten Silbe: Reimteil <em>-oːdɐn</em> → reimt auf{" "}
          <em>lodern, fodern</em>. Etwas kann also durchaus modern <em>und</em>{" "}
          am Modern sein – es klingt nur völlig anders.
        </p>

        <h3>Tenor</h3>
        <div className="wissen-examples">
          <Reading
            word="Tenor"
            tag="Inhalt"
            ipa="[ˈteːnoʁ]"
            pattern="10"
            gloss="Grundaussage, Sinngehalt eines Textes"
          />
          <Reading
            word="Tenor"
            tag="Sänger"
            ipa="[teˈnoːɐ̯]"
            pattern="01"
            gloss="hohe Männerstimme"
          />
        </div>
        <p>
          Der Inhalt-„Tenor" reimt auf <em>Mentor, Viktor, Mentor</em> (Betonung
          vorne). Der Sänger-„Tenor" reimt auf <em>Komfort, Tresor, hervor</em>{" "}
          (Betonung hinten) – zwei Wörter, die nicht einmal miteinander reimen,
          obwohl sie sich buchstabengleich gegenüberstehen.
        </p>

        <h3>umfahren</h3>
        <div className="wissen-examples">
          <Reading
            word="úmfahren"
            tag="trennbar"
            ipa="[ˈʊmfaːʁən]"
            pattern="100"
            gloss="jemanden über den Haufen fahren"
          />
          <Reading
            word="umfáhren"
            tag="untrennbar"
            ipa="[ʊmˈfaːʁən]"
            pattern="010"
            gloss="um ein Hindernis herumfahren"
          />
        </div>
        <p>
          Das vielleicht folgenreichste Homograph der Straßenverkehrsordnung:
          Betont man die erste Silbe (<em>úmfahren</em>), fährt man jemanden um.
          Betont man die zweite (<em>umfáhren</em>), fährt man höflich drumherum
          – ein für den Fußgänger durchaus relevanter Unterschied. Die Betonung
          verschiebt auch den Reimteil: <em>umfáhren</em> reimt sauber ab{" "}
          <em>-aːʁən</em> auf <em>fahren, Scharen, sparen</em>; bei{" "}
          <em>úmfahren</em> wandert die Betonung nach vorn und lässt kaum einen
          Reimpartner übrig.
        </p>

        {/* ── Auswirkung ── */}
        <h2 id="auswirkung">Auswirkung auf die Reimsuche</h2>
        <p>Reimwelt kann pro Wort nur eine IPA-Transkription speichern.</p>
        <p>
          Bei Homographen wird in der Regel die häufigere oder in Wiktionary
          zuerst eingetragene Aussprache verwendet – die andere Variante fehlt.
          Suchst du also nach Reimen auf <em>„modern"</em> in seiner verbalen
          Bedeutung (verrotten), bekommst du möglicherweise trotzdem die
          Reimgruppe des Adjektivs serviert. Oder umgekehrt.
        </p>

        <div className="wissen-callout">
          <p>
            <strong>Workaround:</strong> Wenn du ein Homograph vermutest, suche
            einfach nach einem eindeutigen Wort aus der gewünschten Reimgruppe.
            Gibst du <em>„intern"</em> statt <em>„modern"</em> ein, erhältst du
            zuverlässig alle Wörter auf <em>-dɛʁn</em>.
          </p>
        </div>

        {/* ── Erkennungsmerkmale ── */}
        <h2 id="erkennen">Woran erkennst du ein Homograph?</h2>
        <ul>
          <li>
            Das Wort hat zwei klar verschiedene <strong>Bedeutungen</strong>{" "}
            oder Wortarten (etwa Verb und Adjektiv).
          </li>
          <li>
            Die Ergebnisse wirken <strong>„falsch"</strong> – die Reime passen
            nicht zu der Aussprache, die du im Kopf hast.
          </li>
          <li>
            Im <strong>Detailpanel</strong> (Klick auf das <InfoIcon />
            -Symbol bei einem Treffer) siehst du die gespeicherte IPA. Stimmt
            sie nicht mit deiner Aussprache überein, liegt ein Homograph vor.
          </li>
        </ul>

        {/* ── IPA-Verbindung ── */}
        <h2 id="ipa-fehler">Zusammenhang mit IPA-Fehlern</h2>
        <p>
          Homographe sind eine der häufigsten Ursachen für überraschende
          Ergebnisse – aber nicht die einzige. Automatisch erzeugte
          IPA-Transkriptionen können auch bei eindeutigen Wörtern danebenliegen,
          besonders bei Fremdwörtern oder Komposita. Der Unterschied: Bei einem
          IPA-Fehler gibt es <em>eine</em> korrekte Aussprache, die falsch
          kodiert ist. Beim Homographen gibt es <em>zwei</em> korrekte – und die
          Datenbank muss sich für eine entscheiden.
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
    </div>
  );
}

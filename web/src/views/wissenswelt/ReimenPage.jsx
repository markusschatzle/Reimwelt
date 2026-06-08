"use client";

import React from "react";
import { Link } from "../../router.jsx";
import { WissenToc } from "./_widgets.jsx";
const metrumIcon = "/icons/Metrum.svg";
const ipaIcon = "/icons/IPA.svg";

// Table-of-contents entries — `id` matches the matching <h2 id> below.
const SECTIONS = [
  { id: "definition", label: "Definition" },
  { id: "reimarten", label: "Reimarten" },
  { id: "reimschemata", label: "Reimschemata" },
  { id: "fazit", label: "Und das war erst der Anfang" },
];

// A real, attributed verse with per-line rhyme-scheme tags.
// `lines` is an array of [text, schemeLetter] pairs.
function VerseCard({ lines, author, work }) {
  return (
    <figure className="wissen-verse">
      {lines.map(([text, letter], i) => (
        <div className="wissen-verse-line" key={i}>
          <span className={`wissen-rhyme-tag is-${letter.toLowerCase()}`}>
            {letter}
          </span>
          <span>{text}</span>
        </div>
      ))}
      <figcaption className="wissen-verse-cite">
        {author}, <cite>{work}</cite>
      </figcaption>
    </figure>
  );
}

export default function ReimenPage() {
  return (
    <div className="wissen-layout">
      <WissenToc sections={SECTIONS} />
      <div className="wissen-page">
        <header className="wissen-hero">
          <Link to="/wissenswelt" className="wissen-breadcrumb">
            ← Wissenswelt
          </Link>
          <span className="wissen-kicker">Wissenswelt · Grundlagen</span>
          <h1>Was ist ein Reim?</h1>
          <p className="wissen-lead">
            Die Kunst des Gleichklangs – von der nüchternen Definition über die
            Reimarten bis zu den Schemata, nach denen Dichter seit Jahrhunderten
            ihre Zeilen sortieren.
          </p>
        </header>

        {/* ── Definition ── */}
        <h2 id="definition">Definition</h2>
        <p>
          Ein Reim entsteht, wenn zwei Wörter oder Versenden ab dem letzten{" "}
          <strong>betonten Vokal</strong> gleich oder sehr ähnlich klingen.
          Alles davor – der sogenannte <em>Anlaut</em> – darf verschieden sein.
        </p>
        <p>
          Die Wörter <em>„Stein"</em> [ʃtaɪ̯n] und <em>„Wein"</em> [vaɪ̯n] reimen
          sich, weil beide ab dem Vokal <em>aɪ̯</em> identisch klingen. Der
          Anlaut (<em>ʃt-</em> vs. <em>v-</em>) ist verschieden – genau das
          macht es zum Reim und nicht zur Wiederholung.
        </p>
        <p>
          Reimwelt arbeitet auf dieser Lautebene: Nicht die Buchstaben, sondern
          die IPA-Zeichen entscheiden darüber, ob zwei Wörter reimen.
        </p>

        {/* ── Reimarten ── */}
        <h2 id="reimarten">Reimarten</h2>

        <h3>Reiner Reim</h3>
        <p>
          Die Laute ab dem betonten Vokal sind identisch. Der klassische,
          saubere Gleichklang.
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
            <span className="wissen-example-word">Zeiten / bedeuten</span>
            <span className="wissen-example-ipa">[ˈtsaɪ̯tən] / [bəˈdɔʏ̯tən]</span>
            <span className="wissen-example-gloss">
              aɪ̯ ≈ ɔʏ̯ (ähnliche Diphthonge)
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
          Der Gleichklang beginnt bereits bei der <em>vorletzten</em> betonten
          Silbe – der Reim umfasst also mindestens zwei betonte Silben. Reiche
          Reime klingen besonders eindringlich, können aber leicht gekünstelt
          wirken.
        </p>
        <div className="wissen-examples">
          <div className="wissen-example-row">
            <span className="wissen-example-word">
              Tugendreiche / Jugendstreiche
            </span>
            <span className="wissen-example-ipa">
              [ˈtuːɡəntˌʁaɪ̯çə] / [ˈjuːɡəntˌʃtʁaɪ̯çə]
            </span>
            <span className="wissen-example-gloss">ab „-gend-" gleich</span>
          </div>
          <div className="wissen-example-row">
            <span className="wissen-example-word">
              drüber heben / drüber leben
            </span>
            <span className="wissen-example-ipa">
              [ˈdʁyːbɐ ˈheːbən] / [ˈdʁyːbɐ ˈleːbən]
            </span>
            <span className="wissen-example-gloss">
              „drüber" komplett gleich + -eːbən
            </span>
          </div>
          <div className="wissen-example-row">
            <span className="wissen-example-word">
              abgeschrieben / angetrieben
            </span>
            <span className="wissen-example-ipa">
              [ˌapɡəˈʃʁiːbən] / [ˌanɡəˈtʁiːbən]
            </span>
            <span className="wissen-example-gloss">ab „-ge-" gleich</span>
          </div>
        </div>

        <h3>Rührender Reim</h3>
        <p>
          Der Gleichklang beginnt <em>vor</em> der letzten betonten Silbe – der
          Anlaut der Reimsilbe ist in beiden Wörtern gleich. Das schafft einen
          besonders engen Gleichklang, der oft wie ein Echo klingt.
        </p>
        <p>
          Die genaue Abgrenzung zum Reichen Reim ist in der Forschung nicht
          einheitlich; manche Quellen setzen die Begriffe gleich, andere
          unterscheiden.
        </p>
        <div className="wissen-examples">
          <div className="wissen-example-row">
            <span className="wissen-example-word">traben / Graben</span>
            <span className="wissen-example-ipa">[ˈtʁaːbən] / [ˈɡʁaːbən]</span>
            <span className="wissen-example-gloss">-ʁaːbən gemeinsam</span>
          </div>
          <div className="wissen-example-row">
            <span className="wissen-example-word">blieben / lieben</span>
            <span className="wissen-example-ipa">[ˈbliːbən] / [ˈliːbən]</span>
            <span className="wissen-example-gloss">
              „lieben" komplett in „blieben" enthalten
            </span>
          </div>
        </div>

        <h3>Augenreim</h3>
        <p>
          Wörter, die sich im Schriftbild reimen, aber phonetisch nicht
          übereinstimmen. Im Deutschen relativ selten; im Englischen häufiger
          (z. B. <em>„love / move"</em> [lʌv] / [muːv] – <em>Englisch</em>).
        </p>
        <p>
          Da Reimwelt auf Lautebene arbeitet, werden Augenreime{" "}
          <strong>nicht als Reime gewertet</strong>. Das ist ein Feature, kein
          Bug: Ein Gleichklang, der sich nur liest, aber nicht hört, ist kein
          Reim.
        </p>

        {/* ── Reimschemata ── */}
        <h2 id="reimschemata">Reimschemata</h2>
        <p>
          Reimschemata beschreiben, wie die Reime in einer Strophe angeordnet
          sind. Jeder Buchstabe steht für einen eigenen Klang – und damit du dir
          nichts merken musst, kommen die Beispiele hier von Leuten, die das
          Reimen erwiesenermaßen beherrschten.
        </p>

        <h3>Paarreim (AABB)</h3>
        <p>Je zwei aufeinanderfolgende Zeilen reimen sich.</p>
        <VerseCard
          lines={[
            ["Mancher gibt sich viele Müh,", "A"],
            ["mit dem lieben Federvieh;", "A"],
            ["einesteils der Eier wegen,", "B"],
            ["welche diese Vögel legen.", "B"],
          ]}
          author="Wilhelm Busch"
          work="Max und Moritz"
        />

        <h3>Kreuzreim (ABAB)</h3>
        <p>Gerade und ungerade Zeilen reimen sich abwechselnd.</p>
        <VerseCard
          lines={[
            ["Es war, als hätt der Himmel", "A"],
            ["die Erde still geküsst,", "B"],
            ["dass sie im Blütenschimmer", "A"],
            ["von ihm nur träumen müsst.", "B"],
          ]}
          author="Joseph von Eichendorff"
          work="Mondnacht"
        />

        <h3>Umarmender Reim (ABBA)</h3>
        <p>
          Erste und vierte Zeile reimen sich, ebenso die zweite und dritte – ein
          „eingerahmter" Reim, der die B-Zeilen regelrecht umarmt.
        </p>
        <VerseCard
          lines={[
            ["Du siehst, wohin du siehst, nur Eitelkeit auf Erden.", "A"],
            ["Was dieser heute baut, reißt jener morgen ein;", "B"],
            ["wo itzund Städte stehn, wird eine Wiese sein,", "B"],
            ["auf der ein Schäferskind wird spielen mit den Herden.", "A"],
          ]}
          author="Andreas Gryphius"
          work="Es ist alles eitel"
        />

        {/* ── Fazit ── */}
        <h2 id="fazit">Und das war erst der Anfang</h2>
        <p>
          Was hier steht, kratzt lediglich an der Oberfläche. Die Reimlehre hat
          noch dutzende Spielarten parat: den Schlagreim, den Inreim, den
          Kehrreim, den leoninischen Reim, Reime über Strophengrenzen hinweg –
          und das ist nur das Deutsche. Wer tiefer graben will, findet in der
          Metrik und Stilistik ein riesiges Loch, das sehr lange nach unten
          führt.
        </p>
        <p>
          Für den Einstieg – und für das Finden von Reimpartnern – reicht das
          Gesagte aber vollkommen aus. Dichten ist schließlich Handwerk, kein
          Examen.
        </p>

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
              <img src={metrumIcon} alt="" style={{ height: "0.65rem" }} />{" "}
              Metrum &amp; Rhythmus
            </Link>
            <Link to="/wissenswelt/ipa" className="wissen-also-link">
              <img src={ipaIcon} alt="" /> IPA – Lautschrift
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

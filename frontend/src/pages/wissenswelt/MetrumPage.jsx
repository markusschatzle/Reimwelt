import React from "react";
import { Link } from "react-router-dom";
import { MeterDots, InfoIcon, WissenToc } from "./_widgets.jsx";

// Table-of-contents entries — `id` matches the matching <h2 id> below.
const SECTIONS = [
  { id: "was-ist-metrum", label: "Was ist Metrum?" },
  { id: "vier-versfuesse", label: "Die vier Versfüße" },
  { id: "weitere-versfuesse", label: "Weitere Versfüße" },
  { id: "detailpanel", label: "Metrum im Detailpanel" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Inline colored syllables: stressed = accent, unstressed = muted.
// Each syllable is { t: string, s: boolean }
function ColoredVerse({ syllables }) {
  return (
    <div className="verse-colored">
      {syllables.map((s, i) => (
        <span key={i} className={s.s ? "verse-syl--stress" : undefined}>
          {s.t}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Four main Versfüße  (attributed, with syllabified meter colors)
// ---------------------------------------------------------------------------

const FEET = [
  {
    name: "Jambus",
    schema: "· ˈ",
    pattern: "01010101",
    desc: "Der Jambus beginnt unbetont und endet betont – er klingt vorwärtsgerichtet und ganz natürlich. Es ist das häufigste Versmaß der deutschen Dichtung und steckt auch in mehr Popsongs, als ihren Texterinnen und Textern bewusst ist.",
    // "Ich den-ke dein, wenn mir der Son-ne Schim-mer …"  — iambic pentameter
    syllables: [
      { t: "Ich ", s: false },
      { t: "den", s: true },
      { t: "ke ", s: false },
      { t: "dein, ", s: true },
      { t: "wenn ", s: false },
      { t: "mir ", s: true },
      { t: "der ", s: false },
      { t: "Son", s: true },
      { t: "ne ", s: false },
      { t: "Schim", s: true },
      { t: "mer …", s: false },
    ],
    line: "Ich denke dein, wenn mir der Sonne Schimmer …",
    author: "Johann Wolfgang von Goethe",
    work: "Nähe des Geliebten",
  },
  {
    name: "Trochäus",
    schema: "ˈ ·",
    pattern: "10101010",
    desc: "Das Gegenstück zum Jambus: betont, dann unbetont. Er wirkt entschlossen und fallend, manchmal erdig. Volkslieder, Kinderreime und so mancher Zauberspruch sind durch und durch trochäisch.",
    // "Früh-ling lässt sein blau-es Band …"
    syllables: [
      { t: "Früh", s: true },
      { t: "ling ", s: false },
      { t: "lässt ", s: true },
      { t: "sein ", s: false },
      { t: "blau", s: true },
      { t: "es ", s: false },
      { t: "Band …", s: true },
    ],
    line: "Frühling lässt sein blaues Band …",
    author: "Eduard Mörike",
    work: "Er ist's",
  },
  {
    name: "Daktylus",
    schema: "ˈ · ·",
    pattern: "100100100",
    desc: "Eine betonte und zwei unbetonte Silben – wie ein Herzschlag mit Echo. Tänzerisch und fließend; das Maß antiker Hexameter, festlicher Hymnen und schwermütiger Elegien.",
    // "Auch das Schö-ne muss ster-ben, das Men-schen und Göt-ter …"  (dactylic hexameter)
    syllables: [
      { t: "Auch ", s: true },
      { t: "das ", s: false },
      { t: "Schö", s: false },
      { t: "ne ", s: true },
      { t: "muss ", s: false },
      { t: "ster", s: false },
      { t: "ben, ", s: true },
      { t: "das ", s: false },
      { t: "Men", s: false },
      { t: "schen ", s: true },
      { t: "und ", s: false },
      { t: "Göt", s: false },
      { t: "ter …", s: true },
    ],
    line: "Auch das Schöne muss sterben, das Menschen und Götter bezwinget …",
    author: "Friedrich Schiller",
    work: "Nänie",
  },
  {
    name: "Anapäst",
    schema: "· · ˈ",
    pattern: "001001001",
    desc: "Das Spiegelbild des Daktylus: zwei unbetonte Silben rollen auf die Betonung zu. Drängend und anrollend – wie geschaffen für Verse, in denen es gleich gischtet und tost.",
    // "Und es wal-let und sie-det und brau-set und zischt"
    syllables: [
      { t: "Und ", s: false },
      { t: "es ", s: false },
      { t: "wal", s: true },
      { t: "let ", s: false },
      { t: "und ", s: false },
      { t: "sie", s: true },
      { t: "det ", s: false },
      { t: "und ", s: false },
      { t: "brau", s: true },
      { t: "set ", s: false },
      { t: "und ", s: false },
      { t: "zischt", s: true },
    ],
    line: "Und es wallet und siedet und brauset und zischt",
    author: "Friedrich Schiller",
    work: "Der Taucher",
  },
];

// ---------------------------------------------------------------------------
// Uncommon meters (condensed table)
// ---------------------------------------------------------------------------

const UNCOMMON = [
  {
    name: "Spondeus",
    pattern: "11",
    schema: "ˈ ˈ",
    note: "Zwei Betonungen in Folge – wirkt wuchtig, z. B. in Komposita wie „Sturmnacht“",
  },
  {
    name: "Amphibrach",
    pattern: "010",
    schema: "· ˈ ·",
    note: "Betont in der Mitte; viele dreisilbige Wörter wie „Geliebte“",
  },
  {
    name: "Amphimakros",
    pattern: "101",
    schema: "ˈ · ˈ",
    note: "Auch Kretikus oder Amphimacer genannt und eher innerhalb von Versen zu finden wie z. B. „Dies Gewand“",
  },
  {
    name: "Bacchius",
    pattern: "011",
    schema: "· ˈ ˈ",
    note: "Erst schwach, dann zwei Betonungen; selten im Deutschen",
  },
  {
    name: "Antibacchius",
    pattern: "110",
    schema: "ˈ ˈ ·",
    note: "Zwei Betonungen, dann schwach; ebenso selten",
  },
  {
    name: "Molossus",
    pattern: "111",
    schema: "ˈ ˈ ˈ",
    note: "Drei betonte Silben hintereinander – schwer wie ein Dreischlag-Hammer",
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function FootCard({
  name,
  schema,
  pattern,
  desc,
  syllables,
  line,
  author,
  work,
}) {
  return (
    <div className="meter-foot-section">
      <div className="meter-foot-header">
        <span className="meter-foot-name">{name}</span>
        <MeterDots
          pattern={pattern}
          label={`${name} (Betonungsmuster)`}
          className="meter-dots--lg meter-dots--animated"
        />
        <span className="meter-foot-schema">{schema}</span>
      </div>
      <p>{desc}</p>
      <figure className="wissen-verse wissen-verse--single">
        <ColoredVerse syllables={syllables} />
        <figcaption className="wissen-verse-cite">
          {author}, <cite>{work}</cite>
        </figcaption>
      </figure>
    </div>
  );
}

function UncommonTable() {
  return (
    <div
      className="meter-condensed-table"
      role="table"
      aria-label="Seltene Versfüße"
    >
      {UNCOMMON.map(({ name, pattern, note }) => (
        <div key={name} className="meter-condensed-row" role="row">
          <span className="meter-condensed-name" role="cell">
            {name}
          </span>
          <span className="meter-condensed-dots" role="cell">
            <MeterDots pattern={pattern} label={name} />
          </span>
          <span className="meter-condensed-note" role="cell">
            {note}
          </span>
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
    <div className="wissen-layout">
      <WissenToc sections={SECTIONS} />
      <div className="wissen-page">
        <header className="wissen-hero">
          <Link to="/wissenswelt" className="wissen-breadcrumb">
            ← Wissenswelt
          </Link>
          <span className="wissen-kicker">Wissenswelt · Betonung</span>
          <h1>Metrum &amp; Rhythmus</h1>
          <p className="wissen-lead">
            Der Herzschlag der Sprache: vier klassische Versfüße, mit Punkten
            zerlegt und an echten Versen von Goethe bis Schiller vorgeführt.
          </p>
        </header>

        {/* ── Was ist Metrum? ── */}
        <h2 id="was-ist-metrum">Was ist Metrum?</h2>
        <p>
          Das <strong>Metrum</strong> (auch: Versmaß) ist das regelmäßige
          Betonungsmuster eines Verses oder Songtexts.
        </p>
        <p>
          Es entsteht durch die Abfolge von <strong>betonten</strong> und{" "}
          <strong>unbetonten</strong> Silben – in Reimwelt dargestellt als{" "}
          <MeterDots pattern="10" label="betont, unbetont" /> gefüllte und leere
          Kreise. Die kleinste rhythmische Einheit heißt{" "}
          <strong>Versfuß</strong>; reiht man mehrere aneinander, ergibt sich
          ein vollständiger Vers. Vier Jamben hintereinander heißen etwa
          „vierhebiger Jambus" – das Maß von Shakespeares Sonetten und Schillers
          Balladen.
        </p>
        <p>
          Reimwelt erkennt das Metrum jedes Wortes automatisch aus seinem
          Betonungsmuster und zeigt es im Detailpanel an. Über den Filter in der
          Suchleiste kannst du Ergebnisse auf ein bestimmtes Versmaß
          einschränken.
        </p>

        {/* ── Vier Versfüße ── */}
        <h2 id="vier-versfuesse">Die vier klassischen Versfüße</h2>
        <p>
          Betonte Silben sind{" "}
          <span className="verse-syl--stress">farblich hervorgehoben</span>,
          unbetonte bleiben grau. Die Beispiele sind echte Verszeilen – lies sie
          laut und klopf den Takt mit.
        </p>

        {FEET.map((foot) => (
          <FootCard key={foot.name} {...foot} />
        ))}

        {/* ── Seltene Versfüße ── */}
        <h2 id="weitere-versfuesse">Weitere Versfüße in Reimwelt</h2>
        <p>
          Reimwelt erkennt noch sechs weitere Betonungsmuster. Sie treten
          seltener auf als die großen Vier, tauchen aber in der Datenbank auf
          und können im Metrum-Filter ausgewählt werden.
        </p>
        <UncommonTable />

        {/* ── Metrum in Reimwelt ── */}
        <h2 id="detailpanel">Metrum im Detailpanel</h2>
        <p>
          Im <strong>Detailpanel</strong> jedes Wortes – ein Klick auf das{" "}
          <InfoIcon /> -Symbol bei einem Treffer – siehst du das Betonungsmuster
          als dieselben Kreise:{" "}
          <MeterDots pattern="010" label="unbetont, betont, unbetont" /> steht
          zum Beispiel für ein Wort wie <em>„Geliebte"</em>. Daraus lässt sich
          direkt ablesen, welchem Versfuß das Wort entspricht.
        </p>
        <p>
          Im <strong>Metrum-Filter</strong> der Suchoberfläche kannst du
          Ergebnisse auf einen bestimmten Versfuß einschränken – zum Beispiel
          nur Trochäen oder nur dreisilbige Daktylen.
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
    </div>
  );
}

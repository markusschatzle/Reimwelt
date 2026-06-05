import React from "react";
import { Link } from "react-router-dom";
import { InfoIcon, WissenToc } from "./_widgets.jsx";
import homographIcon from "../../icons/Homograph.svg";
import metrumIcon from "../../icons/Metrum.svg";

// Table-of-contents entries — `id` matches the matching <h2 id> below.
const SECTIONS = [
  { id: "was-ist-ipa", label: "Was ist das IPA?" },
  { id: "warum-ipa", label: "Warum Reimwelt IPA nutzt" },
  { id: "wo-ipa", label: "Wo du IPA siehst" },
  { id: "kurzvokale", label: "Kurzvokalische Laute" },
  { id: "langvokale", label: "Langvokalische Laute" },
  { id: "diphthonge", label: "Diphthonge" },
  { id: "konsonanten", label: "Wichtige Konsonanten" },
  { id: "variation", label: "Viele Aussprachen" },
];

// ---------------------------------------------------------------------------
// IPA symbol tables
// ---------------------------------------------------------------------------

const VOKALE_KURZ = [
  { symbol: "ɪ", example: "Stimme", ipa: "[ˈʃtɪmə]", note: "kurzes i" },
  { symbol: "ʊ", example: "Mutter", ipa: "[ˈmʊtɐ]", note: "kurzes u" },
  { symbol: "ɛ", example: "Bett", ipa: "[bɛt]", note: "kurzes e/ä" },
  { symbol: "ɔ", example: "Kopf", ipa: "[kɔpf]", note: "kurzes o" },
  { symbol: "a", example: "Bass", ipa: "[bas]", note: "kurzes a" },
  {
    symbol: "ə",
    example: "bitte",
    ipa: "[ˈbɪtə]",
    note: "Schwa (unbetontes e)",
  },
  {
    symbol: "ɐ",
    example: "Mutter",
    ipa: "[ˈmʊtɐ]",
    note: "R-Vokal (unbetontes er)",
  },
];

const VOKALE_LANG = [
  { symbol: "iː", example: "Miene", ipa: "[ˈmiːnə]", note: "langes i" },
  { symbol: "eː", example: "See", ipa: "[zeː]", note: "langes e" },
  { symbol: "aː", example: "Hase", ipa: "[ˈhaːzə]", note: "langes a" },
  { symbol: "oː", example: "Boot", ipa: "[boːt]", note: "langes o" },
  { symbol: "uː", example: "Schule", ipa: "[ˈʃuːlə]", note: "langes u" },
  { symbol: "øː", example: "Höhe", ipa: "[ˈhøːə]", note: "langes ö" },
  { symbol: "yː", example: "Hüte", ipa: "[ˈhyːtə]", note: "langes ü" },
];

const DIPHTHONGE = [
  { symbol: "aɪ̯", example: "Eis", ipa: "[aɪ̯s]", note: "ei / ai" },
  { symbol: "aʊ̯", example: "Haus", ipa: "[haʊ̯s]", note: "au" },
  { symbol: "ɔʏ̯", example: "Häuser", ipa: "[ˈhɔʏ̯zɐ]", note: "eu / äu" },
];

const KONSONANTEN = [
  {
    symbol: "ç",
    example: "ich",
    ipa: "[ɪç]",
    note: "ich-Laut (nach i, e, ä …)",
  },
  {
    symbol: "x",
    example: "Bach",
    ipa: "[bax]",
    note: "ach-Laut (nach a, o, u)",
  },
  { symbol: "ʃ", example: "Schule", ipa: "[ˈʃuːlə]", note: "sch" },
  {
    symbol: "ʒ",
    example: "Journalist",
    ipa: "[ʒʊʁnaˈlɪst]",
    note: "stimmhaftes sch (Fremdwörter)",
  },
  {
    symbol: "ŋ",
    example: "singen",
    ipa: "[ˈzɪŋən]",
    note: "ng (nie getrennt gesprochen)",
  },
  { symbol: "ʁ", example: "Regen", ipa: "[ˈʁeːɡən]", note: "Rachen-R" },
  { symbol: "pf", example: "Pferd", ipa: "[pfɛʁt]", note: "Affrikata pf" },
  { symbol: "ts", example: "Zeit", ipa: "[tsaɪ̯t]", note: "Affrikata z" },
];

function IpaTable({ rows }) {
  return (
    <div className="ipa-table-wrap">
      <table className="ipa-table">
        <thead>
          <tr>
            <th scope="col">Symbol</th>
            <th scope="col">Beispielwort</th>
            <th scope="col">IPA</th>
            <th scope="col">Hinweis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol + r.example}>
              <td>
                <span className="ipa-symbol">{r.symbol}</span>
              </td>
              <td>{r.example}</td>
              <td>
                <span className="ipa-symbol" style={{ fontSize: "0.88rem" }}>
                  {r.ipa}
                </span>
              </td>
              <td>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IpaPage() {
  return (
    <div className="wissen-layout">
      <WissenToc sections={SECTIONS} />
      <div className="wissen-page">
        <header className="wissen-hero">
          <Link to="/wissenswelt" className="wissen-breadcrumb">
            ← Wissenswelt
          </Link>
          <span className="wissen-kicker">Wissenswelt · Aussprache</span>
          <h1>IPA – Lautschrift</h1>
          <p className="wissen-lead">
            Das Internationale Phonetische Alphabet: ein Zeichensatz, der
            aufschreibt, was dein Mund tatsächlich tut – und nicht, was die
            Rechtschreibung gern hätte.
          </p>
        </header>

        {/* ── Was ist IPA? ── */}
        <h2 id="was-ist-ipa">Was ist das IPA?</h2>
        <p>
          Das <strong>Internationale Phonetische Alphabet</strong> (IPA) ist ein
          standardisiertes Zeichensystem, mit dem sich die Aussprache jeder
          Sprache der Welt eindeutig aufschreiben lässt. Im Gegensatz zur
          normalen Orthographie, die sich in vielen Sprachen weit von der
          tatsächlichen Aussprache entfernt hat, bildet IPA konsequent{" "}
          <strong>Laute</strong> ab – ein Symbol, ein Laut.
        </p>
        <p>
          IPA-Transkriptionen stehen üblicherweise in eckigen Klammern:{" "}
          <span
            style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
          >
            [ˈhaʊ̯s]
          </span>{" "}
          für <em>Haus</em>. Ein kleines Häkchen{" "}
          <span
            style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
          >
            ˈ
          </span>{" "}
          vor einer Silbe zeigt an, dass diese betont wird.
        </p>

        {/* ── Warum Reimwelt IPA nutzt ── */}
        <h2 id="warum-ipa">Warum Reimwelt IPA nutzt</h2>
        <p>
          Reimwelt vergleicht Wörter nicht auf Buchstabenebene, sondern direkt
          auf Lautebene. Das ist notwendig, weil die deutsche Orthographie (wie
          die meisten Sprachen) keine 1:1-Beziehung zwischen Schreibung und
          Klang hat:
        </p>
        <ul>
          <li>
            <em>„viel"</em> und <em>„Stil"</em> reimen sich, obwohl sie
            unterschiedlich enden (<em>-iel</em> vs. <em>-il</em>).
          </li>
          <li>
            <em>„Regen"</em> und <em>„legen"</em> reimen, während{" "}
            <em>„Regen"</em> und <em>„gegen"</em> ebenfalls reimen – das zeigt
            IPA sofort: alle enden auf{" "}
            <span
              style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
            >
              -eːɡən
            </span>
            .
          </li>
          <li>
            Bei sprachübergreifenden Reimen wäre ein Buchstabenvergleich
            unmöglich: <em>„Eier"</em> (de) und <em>„fire"</em> (en) reimen
            sich, aber nur IPA macht das sichtbar.
          </li>
        </ul>

        {/* ── Wo IPA erscheint ── */}
        <h2 id="wo-ipa">Wo du IPA in Reimwelt siehst</h2>
        <ul>
          <li>
            <strong>Suchleiste:</strong> Während du tippst, erscheint rechts die
            IPA-Transkription des eingegebenen Wortes.
          </li>
          <li>
            <strong>Detailpanel:</strong> Klickst du auf das <InfoIcon />
            -Symbol bei einem Treffer, siehst du die vollständige IPA-Schreibung
            inkl. Betonung.
          </li>
          <li>
            <strong>Reimteil:</strong> In den Suchergebnissen ist der Reimteil
            (der übereinstimmende Lautabschnitt) farblich hervorgehoben.
          </li>
        </ul>

        {/* ── Tabellen ── */}
        <h2 id="kurzvokale">Kurzvokalische Laute</h2>
        <IpaTable rows={VOKALE_KURZ} />

        <h2 id="langvokale">Langvokalische Laute</h2>
        <IpaTable rows={VOKALE_LANG} />

        <h2 id="diphthonge">Diphthonge</h2>
        <p>
          Diphthonge sind Doppelvokale – zwei Vokallaute, die innerhalb einer
          Silbe ineinandergleitend gesprochen werden.
        </p>
        <IpaTable rows={DIPHTHONGE} />

        <h2 id="konsonanten">Wichtige Konsonanten</h2>
        <p>
          Die meisten deutschen Konsonanten entsprechen dem lateinischen
          Alphabet. Diese Sondersymbole treten häufig auf und unterscheiden sich
          von der Schreibung:
        </p>
        <IpaTable rows={KONSONANTEN} />

        {/* ── Variation ── */}
        <h2 id="variation">Eine Schreibweise, viele Aussprachen</h2>
        <p>
          Hier wird es kniffflig: <em>Die eine</em> richtige Aussprache gibt es
          oft gar nicht.
        </p>
        <p>
          Wie ein Wort klingt, hängt von Dialekt, Region, Akzent und sogar der
          Sprechsituation ab. Reimwelt kann pro Wort aber nur{" "}
          <strong>eine</strong> IPA-Transkription speichern – in der Regel die
          überregionale Standardlautung. Dein Sprachgefühl darf davon abweichen.
        </p>
        <p>
          Das Paradebeispiel ist die Endung <em>-ig</em>. In der Standardlautung
          wird sie als ich-Laut <span className="ipa-symbol">[ɪç]</span>{" "}
          gesprochen – dann reimt <em>lustig</em> sauber auf <em>möglich</em>:
        </p>
        <div className="wissen-examples">
          <div className="wissen-example-row">
            <span className="wissen-example-word">
              lustig
              <span className="wissen-example-tag">Standard</span>
            </span>
            <span className="wissen-example-ipa">[ˈlʊstɪç]</span>
            <span className="wissen-example-gloss">
              reimt auf möglich [ˈmøːklɪç]
            </span>
          </div>
          <div className="wissen-example-row">
            <span className="wissen-example-word">
              lustig
              <span className="wissen-example-tag">süddt. / öster.</span>
            </span>
            <span className="wissen-example-ipa">[ˈlʊstɪk]</span>
            <span className="wissen-example-gloss">
              mit hartem g – reimt <em>nicht</em> auf möglich
            </span>
          </div>
        </div>
        <p>
          Spricht jemand das <em>g</em> hingegen hart aus –{" "}
          <span className="ipa-symbol">[ˈlʊstɪk]</span>, wie in weiten Teilen
          Süddeutschlands, Österreichs und der Schweiz –, ist der Reim auf{" "}
          <em>möglich</em> dahin. Beide Aussprachen sind völlig korrekt; sie
          führen nur zu verschiedenen Reimen. Genau diese Vielstimmigkeit ist
          eine der größten Hürden, die eine algorithmische Reimsuche
          grundsätzlich nicht auflösen kann: Sie muss sich für eine Lesart
          entscheiden – und liegt damit für einen Teil der Sprecher zwangsläufig
          daneben.
        </p>

        {/* ── Tipp ── */}
        <div className="wissen-callout">
          <p>
            <strong>Tipp:</strong> Wenn ein Reimvorschlag seltsam aussieht,
            überprüfe die IPA im Detailpanel. Stimmt die Transkription nicht mit
            deiner Aussprache überein, könnte es sich um einen{" "}
            <Link to="/wissenswelt/homographe">Homographen</Link> oder einen
            automatisch generierten IPA-Fehler handeln.
          </p>
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
            <Link to="/wissenswelt/homographe" className="wissen-also-link">
              <img src={homographIcon} alt="" /> Homographe
            </Link>
            <Link to="/wissenswelt/metrum" className="wissen-also-link">
              <img src={metrumIcon} alt="" style={{ height: "0.65rem" }} /> Metrum &amp; Rhythmus
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

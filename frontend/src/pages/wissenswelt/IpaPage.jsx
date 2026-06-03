import React from "react";
import { Link } from "react-router-dom";

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
            <th>Symbol</th>
            <th>Beispielwort</th>
            <th>IPA</th>
            <th>Hinweis</th>
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
    <div className="wissen-page">
      <Link to="/wissenswelt" className="wissen-breadcrumb">
        ← Wissenswelt
      </Link>

      <h1>IPA – Lautschrift</h1>
      <p className="wissen-subtitle">
        Das Internationale Phonetische Alphabet – wie es funktioniert, warum
        Reimwelt es verwendet und was die wichtigsten Symbole bedeuten.
      </p>

      {/* ── Was ist IPA? ── */}
      <h2>Was ist das IPA?</h2>
      <p>
        Das <strong>Internationale Phonetische Alphabet</strong> (IPA) ist ein
        standardisiertes Zeichensystem, mit dem sich die Aussprache jeder
        Sprache der Welt eindeutig aufschreiben lässt. Im Gegensatz zur normalen
        Orthographie, die sich in vielen Sprachen weit von der tatsächlichen
        Aussprache entfernt hat, bildet IPA konsequent <strong>Laute</strong> ab
        – ein Symbol, ein Laut.
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
      <h2>Warum Reimwelt IPA nutzt</h2>
      <p>
        Reimwelt vergleicht Wörter nicht auf Buchstabenebene, sondern direkt auf
        Lautebene. Das ist notwendig, weil die deutsche Orthographie (wie die
        meisten Sprachen) keine 1:1-Beziehung zwischen Schreibung und Klang hat:
      </p>
      <ul>
        <li>
          <em>„viel"</em> und <em>„Stil"</em> reimen sich, obwohl sie
          unterschiedlich enden (<em>-iel</em> vs. <em>-il</em>).
        </li>
        <li>
          <em>„Regen"</em> und <em>„legen"</em> reimen, während <em>„Regen"</em>{" "}
          und <em>„gegen"</em> ebenfalls reimen – das zeigt IPA sofort: alle
          enden auf{" "}
          <span
            style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
          >
            -eːɡən
          </span>
          .
        </li>
        <li>
          Bei sprachübergreifenden Reimen wäre ein Buchstabenvergleich
          unmöglich: <em>„Eier"</em> (de) und <em>„fire"</em> (en) reimen sich,
          aber nur IPA macht das sichtbar.
        </li>
      </ul>

      {/* ── Wo IPA erscheint ── */}
      <h2>Wo du IPA in Reimwelt siehst</h2>
      <ul>
        <li>
          <strong>Suchleiste:</strong> Während du tippst, erscheint rechts die
          IPA-Transkription des eingegebenen Wortes.
        </li>
        <li>
          <strong>Detailpanel:</strong> Klickst du auf das ⓘ-Symbol bei einem
          Treffer, siehst du die vollständige IPA-Schreibung inkl. Betonung.
        </li>
        <li>
          <strong>Reimteil:</strong> In den Suchergebnissen ist der Reimteil
          (der übereinstimmende Lautabschnitt) farblich hervorgehoben.
        </li>
      </ul>

      {/* ── Tabellen ── */}
      <h2>Kurzvokalische Laute</h2>
      <IpaTable rows={VOKALE_KURZ} />

      <h2>Langvokalische Laute</h2>
      <IpaTable rows={VOKALE_LANG} />

      <h2>Diphthonge</h2>
      <p>
        Diphthonge sind Doppelvokale – zwei Vokallaute, die innerhalb einer
        Silbe ineinandergleitend gesprochen werden.
      </p>
      <IpaTable rows={DIPHTHONGE} />

      <h2>Wichtige Konsonanten</h2>
      <p>
        Die meisten deutschen Konsonanten entsprechen dem lateinischen Alphabet.
        Diese Sondersymbole treten häufig auf und unterscheiden sich von der
        Schreibung:
      </p>
      <IpaTable rows={KONSONANTEN} />

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
            🔤 Homographe
          </Link>
          <Link to="/wissenswelt/metrum" className="wissen-also-link">
            🎼 Metrum &amp; Rhythmus
          </Link>
          <Link to="/wissenswelt" className="wissen-also-link">
            ← Wissenswelt
          </Link>
        </div>
      </div>
    </div>
  );
}

import HomographePage from "../../../../src/views/wissenswelt/HomographePage.jsx";

export async function generateMetadata({ params }) {
  const lang = params.lang || "de";
  return {
    title: "Homographe: gleich geschrieben, verschieden ausgesprochen",
    description:
      "Was sind Homographe? Wörter wie „modern" oder „Tenor" klingen je nach Bedeutung völlig anders. Mit Beispielen, IPA-Aussprache und Auswirkung auf die Reimsuche.",
    alternates: { canonical: `/${lang}/wissenswelt/homographe` },
    robots: { index: true, follow: true },
    openGraph: {
      title: "Homographe: gleich geschrieben, verschieden ausgesprochen",
      description:
        "Wörter wie „modern" oder „Tenor" – gleiche Schreibung, verschiedene Aussprache und Bedeutung.",
      type: "article",
    },
  };
}

export default function Page({ params }) {
  const lang = params.lang || "de";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Homographe: gleich geschrieben, verschieden ausgesprochen",
    description:
      "Was sind Homographe? Beispiele aus dem Deutschen mit IPA-Aussprache.",
    inLanguage: lang,
    url: `https://reimwelt.de/${lang}/wissenswelt/homographe`,
    publisher: {
      "@type": "Organization",
      name: "Reimwelt",
      url: "https://reimwelt.de",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomographePage />
    </>
  );
}

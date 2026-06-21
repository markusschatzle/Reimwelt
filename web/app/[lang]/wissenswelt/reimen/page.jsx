import ReimenPage from "../../../../src/views/wissenswelt/ReimenPage.jsx";

export async function generateMetadata({ params }) {
  const lang = params.lang || "de";
  return {
    title: "Was ist ein Reim? Reimarten einfach erklärt",
    description:
      "Reiner Reim, unreiner Reim, Kreuzreim, Paarreim – alle Reimarten verständlich erklärt, mit Beispielen und IPA-Lautschrift. Grundlagenwissen für Lyrik, Rap und Gedichte.",
    alternates: { canonical: `/${lang}/wissenswelt/reimen` },
    robots: { index: true, follow: true },
    openGraph: {
      title: "Was ist ein Reim? Reimarten einfach erklärt",
      description:
        "Reiner Reim, unreiner Reim, Kreuzreim, Paarreim – alle Reimarten mit Beispielen.",
      type: "article",
    },
  };
}

export default function Page({ params }) {
  const lang = params.lang || "de";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Was ist ein Reim? Reimarten einfach erklärt",
    description:
      "Reiner Reim, unreiner Reim, Kreuzreim, Paarreim – alle Reimarten verständlich erklärt.",
    inLanguage: lang,
    url: `https://reimwelt.de/${lang}/wissenswelt/reimen`,
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
      <ReimenPage />
    </>
  );
}

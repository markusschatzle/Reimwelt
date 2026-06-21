import MetrumPage from "../../../../src/views/wissenswelt/MetrumPage.jsx";

export async function generateMetadata({ params }) {
  const lang = params.lang || "de";
  return {
    title: "Metrum & Versmaß erklärt: Jambus, Trochäus, Daktylus",
    description:
      "Was ist ein Jambus? Was ist ein Trochäus? Alle klassischen Versmaße einfach erklärt – mit Beispielen, Betonungsmustern und Merkhilfen für Gedicht und Lyrik.",
    alternates: { canonical: `/${lang}/wissenswelt/metrum` },
    robots: { index: true, follow: true },
    openGraph: {
      title: "Metrum & Versmaß: Jambus, Trochäus, Daktylus erklärt",
      description:
        "Alle klassischen Versmaße einfach erklärt – mit Beispielen und Betonungsmustern.",
      type: "article",
    },
  };
}

export default function Page({ params }) {
  const lang = params.lang || "de";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Metrum & Versmaß erklärt: Jambus, Trochäus, Daktylus",
    description:
      "Alle klassischen Versmaße einfach erklärt – mit Beispielen und Betonungsmustern.",
    inLanguage: lang,
    url: `https://reimwelt.de/${lang}/wissenswelt/metrum`,
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
      <MetrumPage />
    </>
  );
}

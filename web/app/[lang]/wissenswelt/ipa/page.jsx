import IpaPage from "../../../../src/views/wissenswelt/IpaPage.jsx";

export async function generateMetadata({ params }) {
  const lang = params.lang || "de";
  return {
    title: "IPA Lautschrift Deutsch – Internationales Phonetisches Alphabet",
    description:
      "Das Internationale Phonetische Alphabet (IPA) einfach erklärt: Welche Zeichen gibt es im Deutschen? Wie liest man Lautschrift? Mit vollständiger Zeichenübersicht.",
    alternates: { canonical: `/${lang}/wissenswelt/ipa` },
    robots: { index: true, follow: true },
    openGraph: {
      title: "IPA Lautschrift Deutsch – Internationales Phonetisches Alphabet",
      description:
        "IPA-Zeichen im Deutschen einfach erklärt – mit vollständiger Zeichenübersicht.",
      type: "article",
    },
  };
}

export default function Page({ params }) {
  const lang = params.lang || "de";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "IPA Lautschrift Deutsch – Internationales Phonetisches Alphabet",
    description:
      "IPA-Zeichen im Deutschen einfach erklärt – mit vollständiger Zeichenübersicht.",
    inLanguage: lang,
    url: `https://reimwelt.de/${lang}/wissenswelt/ipa`,
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
      <IpaPage />
    </>
  );
}

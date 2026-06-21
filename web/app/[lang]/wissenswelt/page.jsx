import WissensweltPage from "../../../src/views/wissenswelt/WissensweltPage.jsx";

export async function generateMetadata({ params }) {
  const lang = params.lang || "de";
  return {
    title: "Reim-Wissen: Reimarten, Versmaß & Lautschrift erklärt",
    description:
      "Grundlagenwissen rund ums Reimen: Was ist ein Reim? Welche Reimarten gibt es? Wie funktioniert Metrum (Jambus, Trochäus)? Und was bedeutet die IPA-Lautschrift?",
    alternates: { canonical: `/${lang}/wissenswelt` },
    robots: { index: true, follow: true },
    openGraph: {
      title: "Reim-Wissen: Reimarten, Versmaß & Lautschrift erklärt",
      description:
        "Reimarten, Metrum, IPA-Lautschrift und Homographe – alles Wissenswerte rund ums Reimen.",
      type: "website",
    },
  };
}

export default function Page() {
  return <WissensweltPage />;
}

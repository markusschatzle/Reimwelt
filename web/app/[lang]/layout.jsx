import { notFound } from "next/navigation";
import { LOCALES, isLocale } from "../../src/routes.js";
import { LangProvider } from "../../src/lang.jsx";
import AppShell from "../../src/components/AppShell.jsx";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default function LangLayout({ children, params }) {
  const { lang } = params;
  if (!isLocale(lang)) notFound();

  return (
    <LangProvider lang={lang}>
      <AppShell>{children}</AppShell>
    </LangProvider>
  );
}

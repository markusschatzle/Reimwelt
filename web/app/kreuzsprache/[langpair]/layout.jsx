import { notFound } from "next/navigation";
import { LANG_PAIRS, parseLangpair } from "../../../src/routes.js";
import { LangProvider } from "../../../src/lang.jsx";
import AppShell from "../../../src/components/AppShell.jsx";

export function generateStaticParams() {
  return LANG_PAIRS.map(([src, tgt]) => ({ langpair: `${src}-${tgt}` }));
}

export default function CrossLayout({ children, params }) {
  const pair = parseLangpair(params.langpair);
  if (!pair) notFound();
  // Page voice follows the source language → that's the locale for the shell.
  return (
    <LangProvider lang={pair.src}>
      <AppShell>{children}</AppShell>
    </LangProvider>
  );
}

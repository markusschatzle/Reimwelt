"use client";

// Compatibility shim so components ported from react-router-dom keep their
// `<Link to=…>` / `<NavLink to=…>` API. Links are locale-prefixed via the
// current LangProvider, so call sites can keep using legacy paths like "/reime".

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "./lang.jsx";
import { localizeHref } from "./links.js";

export function Link({ to, href, children, ...rest }) {
  const lang = useLang();
  const target = localizeHref(lang, to ?? href);
  return (
    <NextLink href={target} {...rest}>
      {children}
    </NextLink>
  );
}

export function NavLink({ to, href, className, children, onClick, ...rest }) {
  const lang = useLang();
  const pathname = usePathname() || "";
  const target = localizeHref(lang, to ?? href);

  const langHome = `/${lang}`;
  const isActive =
    pathname === target ||
    (target !== langHome && pathname.startsWith(target + "/")) ||
    (target !== langHome && pathname === target);

  const cls =
    typeof className === "function" ? className({ isActive }) : className;

  return (
    <NextLink href={target} className={cls} onClick={onClick} {...rest}>
      {children}
    </NextLink>
  );
}

/** Minimal useLocation shim (pathname only). */
export function useLocation() {
  return { pathname: usePathname() || "" };
}

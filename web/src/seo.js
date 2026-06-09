const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://reimwelt.de";

/**
 * Build a schema.org BreadcrumbList from `[{ name, href }]` (href is a relative
 * path; made absolute here). Pair this with a visible <Breadcrumbs> trail so the
 * markup is eligible for breadcrumb rich results.
 */
export function breadcrumbList(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.href ? { item: `${SITE}${it.href}` } : {}),
    })),
  };
}

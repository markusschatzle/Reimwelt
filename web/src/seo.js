const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://reimwelt.de";

// Default social-share image (resolved against metadataBase). 1200×630.
export const OG_IMAGE = {
  url: "/icons/OpenGraph_Image.jpg",
  width: 1200,
  height: 630,
  alt: "Reimwelt – phonetische Reimsuche",
};

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

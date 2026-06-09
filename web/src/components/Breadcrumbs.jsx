import Link from "next/link";

// Visible breadcrumb trail. `items` is [{ name, href }] from root to current;
// the last item renders as plain text (the current page). Presentational and
// server-renderable — pair with breadcrumbList() JSON-LD for rich results.
export default function Breadcrumbs({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${it.name}-${i}`}>
              {isLast || !it.href ? (
                <span aria-current="page">{it.name}</span>
              ) : (
                <Link href={it.href}>{it.name}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

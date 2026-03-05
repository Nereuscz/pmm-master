import Link from "next/link";

type Crumb = { label: string; href?: string };

type Props = { items: Crumb[] };

export default function Breadcrumbs({ items }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-body">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 ? (
              <span className="text-apple-text-muted" aria-hidden>
                ›
              </span>
            ) : null}
            {item.href ? (
              <Link
                href={item.href}
                className="text-brand-600 hover:text-brand-700 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-apple-text-secondary">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

import Link from "next/link";

type Crumb = { label: string; href?: string };

type Props = { items: Crumb[] };

export default function Breadcrumbs({ items }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-caption">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 ? (
              <span className="text-apple-text-muted" aria-hidden>
                /
              </span>
            ) : null}
            {item.href ? (
              <Link
                href={item.href}
                className="text-apple-text-tertiary hover:text-apple-text-secondary"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-apple-text-secondary">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

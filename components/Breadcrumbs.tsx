import Link from "next/link";

type Crumb = { label: string; href?: string };

type Props = { items: Crumb[] };

export default function Breadcrumbs({ items }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-[14px]">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 ? (
              <span className="text-[#aeaeb2]" aria-hidden>
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
              <span className="text-[#6e6e73]">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

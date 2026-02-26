"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Projekty" },
  { href: "/process", label: "Zpracovat" },
  { href: "/guide", label: "Průvodce" },
  { href: "/kb", label: "Znalostní báze" }
];

export default function Nav() {
  const pathname = usePathname();

  // Skryj nav na přihlašovací stránce
  if (pathname === "/signin" || pathname === "/") return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold tracking-tight text-brand-700">PM</span>
          <span className="text-lg font-semibold text-slate-800">Assistant</span>
          <span className="hidden text-xs text-slate-400 sm:block">· JIC</span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

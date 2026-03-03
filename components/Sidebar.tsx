"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type UserRole = "Admin" | "PM" | "Viewer" | null;

type SidebarProps = {
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
};

const links: Array<{
  href: string;
  label: string;
  roles?: UserRole[];
  icon: React.ReactNode;
}> = [
  {
    href: "/dashboard",
    label: "Projekty",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: "/process",
    label: "Zpracovat",
    roles: ["Admin", "PM"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    href: "/guide",
    label: "Průvodce",
    roles: ["Admin", "PM"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    href: "/kb",
    label: "Znalostní báze",
    roles: ["Admin", "PM"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    roles: ["Admin"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Nastavení",
    roles: ["Admin", "PM"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

type UserInfo = { role: UserRole | null; name?: string | null; email?: string | null };

export default function Sidebar({ drawerOpen = false, onDrawerClose }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo>({ role: null });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) =>
        setUser({
          role: json.role ?? null,
          name: json.name ?? null,
          email: json.email ?? null
        })
      )
      .catch(() => setUser({ role: null }));
  }, []);

  const visibleLinks = links.filter(
    (link) => !link.roles || !user.role || link.roles.includes(user.role)
  );

  const navContent = (
    <>
      {/* Logo */}
      <div className="px-5 pb-4 pt-6">
        <Link href="/dashboard" onClick={onDrawerClose} className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <span className="text-[13px] font-bold text-white">PM</span>
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-[#1d1d1f]">PM Assistant</div>
            <div className="text-[11px] text-[#86868b]">JIC</div>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-[#f2f2f7]" />

      {/* Navigace */}
      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        <p className="mb-1.5 mt-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#aeaeb2]">
          Menu
        </p>
        {visibleLinks.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onDrawerClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                active
                  ? "bg-brand-50 text-brand-600"
                  : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
              }`}
            >
              <span className={active ? "text-brand-600" : "text-[#aeaeb2]"}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Uživatel + odhlášení */}
      <div className="mt-auto px-5 pb-6">
        <div className="border-t border-[#f2f2f7] pt-4">
          {(user.name || user.email) && (
            <div className="mb-3">
              <p className="truncate text-[13px] font-medium text-[#1d1d1f]">
                {user.name || user.email}
              </p>
              {user.email && user.name && (
                <p className="truncate text-[11px] text-[#86868b]">{user.email}</p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              onDrawerClose?.();
              signOut({ callbackUrl: "/signin" });
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
          >
            Odhlásit se
          </button>
          <p className="mt-3 text-[11px] text-[#aeaeb2]">PM Assistant v1.2</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar – skrytý na mobilu */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-[#e8e8ed] bg-white md:flex">
        {navContent}
      </aside>

      {/* Mobile overlay + drawer – skrytý na desktopu */}
      <div className="md:hidden">
        <div
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={onDrawerClose}
          aria-hidden
        />
        <aside
          className={`fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-[#e8e8ed] bg-white shadow-apple-lg transition-transform duration-200 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {navContent}
        </aside>
      </div>
    </>
  );
}

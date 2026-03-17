"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { fetchDedup } from "@/lib/fetch-dedup";

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
    label: "Domů",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Projekty",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
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

function UserAvatar({ name, email }: { name?: string | null; email?: string | null }) {
  const initial = (name?.charAt(0) ?? email?.charAt(0) ?? "?").toUpperCase();
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-400/20">
      <span className="text-[11px] font-semibold text-gold-300">{initial}</span>
    </div>
  );
}

export default function Sidebar({ drawerOpen = false, onDrawerClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const [user, setUser] = useState<UserInfo>({ role: null });
  const [userLoaded, setUserLoaded] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        setUser({
          role: json.role ?? null,
          name: json.name ?? null,
          email: json.email ?? null
        });
        setUserLoaded(true);
      })
      .catch(() => {
        setUser({ role: null });
        setUserLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (
      projectIdParam &&
      (pathname === "/process" || pathname === "/guide")
    ) {
      fetchDedup("/api/projects")
        .then((r) => r.json())
        .then((json) => {
          const projects = json.projects ?? [];
          const p = projects.find((x: { id: string }) => x.id === projectIdParam);
          setCurrentProjectName(p?.name ?? null);
        })
        .catch(() => setCurrentProjectName(null));
    } else {
      setCurrentProjectName(null);
    }
  }, [pathname, projectIdParam]);

  // Před načtením uživatele zobrazíme jen neomezené položky, aby nedošlo k "bliknutí" chybějících odkazů
  const visibleLinks = links.filter(
    (link) => !link.roles || (userLoaded && user.role && link.roles.includes(user.role))
  );

  const navContent = (
    <>
      {/* Logo */}
      <div className="px-5 pb-4 pt-6">
        <Link href="/dashboard" onClick={onDrawerClose} className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-400">
            <span className="text-[13px] font-semibold text-brand-900">PM</span>
          </div>
          <div className="leading-tight">
            <div className="text-body font-semibold text-white/90">PM Assistant</div>
            <div className="text-footnote text-white/40">JIC</div>
          </div>
        </Link>
      </div>

      {/* + Nový chat */}
      <div className="px-3 pb-3 pt-2">
        <Link
          href="/guide"
          onClick={onDrawerClose}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white/90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nový chat
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/10" />

      {/* Kontext projektu – na Process/Guide s projectId */}
      {currentProjectName && projectIdParam ? (
        <div className="mx-3 mt-3 rounded-lg bg-white/8 px-3 py-2 text-[12px]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Projekt</p>
          <Link
            href={`/projects/${projectIdParam}`}
            onClick={onDrawerClose}
            className="mt-0.5 block truncate font-medium text-white/80 hover:text-white hover:underline"
          >
            {currentProjectName}
          </Link>
        </div>
      ) : null}

      {/* Navigace */}
      <nav className="mt-2 flex-1 space-y-0.5 px-2.5">
        {visibleLinks.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onDrawerClose}
              className={`nav-item${active ? " active" : ""}`}
            >
              <span className="opacity-70">
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Uživatel + odhlášení */}
      <div className="mt-auto px-4 pb-6">
        <div className="border-t border-white/10 pt-4">
          {(user.name || user.email) && (
            <div className="mb-3 flex items-center gap-2.5">
              <UserAvatar name={user.name} email={user.email} />
              <div className="min-w-0">
                <p className="truncate text-caption font-medium text-white/80" title={user.name || user.email || undefined}>
                  {user.name || user.email}
                </p>
                {user.email && user.name && (
                  <p className="truncate text-footnote text-white/40" title={user.email}>{user.email}</p>
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              onDrawerClose?.();
              signOut({ callbackUrl: "/signin" });
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-caption font-medium text-white/50 transition-colors duration-150 hover:bg-white/8 hover:text-white/80"
          >
            Odhlásit se
          </button>
          <p className="mt-3 text-footnote text-white/25">PM Assistant v1.2</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar – dark warm tone */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col bg-[#2A1657] md:flex">
        {navContent}
      </aside>

      {/* Mobile overlay + drawer */}
      <div className="md:hidden">
        <div
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={onDrawerClose}
          aria-hidden
        />
        <aside
          className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-[#2A1657] shadow-apple-lg transition-transform duration-200 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {navContent}
        </aside>
      </div>
    </>
  );
}

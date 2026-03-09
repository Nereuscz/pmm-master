"use client";

import { usePathname } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

const HIDE_SIDEBAR = ["/", "/signin"];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !HIDE_SIDEBAR.includes(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-apple-bg-page">
      {/* Skip to content – viditelné při focusu pro klávesnicovou navigaci */}
      <a
        href="#main-content"
        className="absolute -top-12 left-4 z-[100] rounded-lg bg-brand-600 px-4 py-2 text-body font-medium text-white transition-[top] duration-200 focus:top-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
      >
        Přeskočit na obsah
      </a>
      {showSidebar && (
        <>
          {/* Mobile header s hamburgerem – glassmorphism */}
          <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-apple-border-light bg-white/80 px-4 backdrop-blur-xl md:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-apple-text-secondary transition-colors duration-200 hover:bg-apple-bg-page focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
              aria-label="Otevřít menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
                <span className="text-[11px] font-bold text-white">PM</span>
              </div>
              <span className="text-body font-semibold text-apple-text-primary">PM Assistant</span>
            </Link>
          </header>

          <Suspense fallback={null}>
            <Sidebar
              drawerOpen={drawerOpen}
              onDrawerClose={() => setDrawerOpen(false)}
            />
          </Suspense>
        </>
      )}
      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 min-h-screen ${showSidebar ? "md:ml-64" : ""} ${showSidebar ? "pt-14 md:pt-0" : ""}`}
        aria-label="Hlavní obsah"
      >
        {children}
      </main>
    </div>
  );
}

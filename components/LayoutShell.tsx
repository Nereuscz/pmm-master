"use client";

import { usePathname } from "next/navigation";
import { useState, Suspense } from "react";
import Sidebar from "@/components/Sidebar";

const HIDE_SIDEBAR = ["/", "/signin"];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !HIDE_SIDEBAR.includes(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      {showSidebar && (
        <>
          {/* Mobile header s hamburgerem */}
          <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-[#e8e8ed] bg-white px-4 md:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6e6e73] hover:bg-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
              aria-label="Otevřít menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <a href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
                <span className="text-[11px] font-bold text-white">PM</span>
              </div>
              <span className="text-[15px] font-semibold text-[#1d1d1f]">PM Assistant</span>
            </a>
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
        className={`flex-1 min-h-screen ${showSidebar ? "md:ml-60" : ""} ${showSidebar ? "pt-14 md:pt-0" : ""}`}
      >
        {children}
      </main>
    </div>
  );
}

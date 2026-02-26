"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

const HIDE_SIDEBAR = ["/", "/signin"];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !HIDE_SIDEBAR.includes(pathname);

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      {showSidebar && <Sidebar />}
      <main className={showSidebar ? "ml-60 flex-1 min-h-screen" : "flex-1 min-h-screen"}>
        {children}
      </main>
    </div>
  );
}

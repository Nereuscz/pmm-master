import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "PM Assistant · JIC",
  description: "AI asistent pro zpracování PM transkriptů a export do Asany"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-slate-50">
        <Nav />
        {children}
      </body>
    </html>
  );
}

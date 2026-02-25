import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PM Assistant",
  description: "AI PM assistant for transcript processing and Asana export"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}

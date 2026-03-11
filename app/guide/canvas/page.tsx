"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CanvasPage() {
  const router = useRouter();

  // Redirect na unified chatbot s mode=canvas
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("projectId");
    const dest = projectId
      ? `/guide?projectId=${projectId}&mode=canvas`
      : "/guide?mode=canvas";
    router.replace(dest);
  }, [router]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-apple-text-secondary">Přesměrování...</p>
    </main>
  );
}

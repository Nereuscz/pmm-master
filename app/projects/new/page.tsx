"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FRAMEWORK_INFO = {
  Produktový: "Tvorba nebo redesign konkrétní služby / produktu JIC pro klienty.",
  Univerzální: "Interní projekty, procesní změny nebo infrastruktura."
};

export default function NewProjectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [framework, setFramework] = useState<"Univerzální" | "Produktový">("Univerzální");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const payload = {
        name: String(data.get("name") || ""),
        framework: String(data.get("framework") || ""),
        phase: String(data.get("phase") || "")
      };
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Uložení projektu selhalo.");
      router.push(`/projects/${json.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při vytváření projektu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-8 py-10">
      <div className="mb-6">
        <Link href="/dashboard" className="text-[14px] text-brand-600 hover:text-brand-700">
          ← Zpět na projekty
        </Link>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">Nový projekt</h1>
        <p className="mt-1 text-[15px] text-[#6e6e73]">Vyplň základní informace o projektu.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-apple bg-white p-8 shadow-apple">
        {/* Název */}
        <div>
          <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
            Název projektu
          </label>
          <input
            name="name"
            required
            className="w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            placeholder="Např. Scale-up program 2026"
          />
        </div>

        {/* Framework */}
        <div>
          <label className="mb-3 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
            Typ frameworku
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["Univerzální", "Produktový"] as const).map((fw) => (
              <label
                key={fw}
                className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                  framework === fw
                    ? "border-brand-600 bg-brand-50"
                    : "border-[#e8e8ed] bg-[#f9f9f9] hover:border-[#d2d2d7]"
                }`}
              >
                <input
                  type="radio"
                  name="framework"
                  value={fw}
                  className="sr-only"
                  checked={framework === fw}
                  onChange={() => setFramework(fw)}
                />
                {framework === fw && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                <p className="text-[15px] font-semibold text-[#1d1d1f]">{fw}</p>
                <p className="mt-1 text-[13px] leading-snug text-[#6e6e73]">{FRAMEWORK_INFO[fw]}</p>
              </label>
            ))}
          </div>
        </div>

        {/* Fáze */}
        <div>
          <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
            Počáteční fáze
          </label>
          <select
            name="phase"
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          >
            {["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="rounded-xl bg-[#fff2f2] px-4 py-3 text-[14px] text-[#c0392b]">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand-600 py-3 text-[15px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Vytvářím..." : "Vytvořit projekt"}
        </button>
      </form>
    </main>
  );
}

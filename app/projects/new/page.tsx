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
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
          ← Zpět na projekty
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Nový projekt</h1>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Název projektu</label>
          <input
            name="name"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            placeholder="Např. Scale-up program 2026"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Typ frameworku</label>
          <div className="grid grid-cols-2 gap-3">
            {(["Univerzální", "Produktový"] as const).map((fw) => (
              <label
                key={fw}
                className={`cursor-pointer rounded-lg border-2 p-3 transition-colors ${
                  framework === fw ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-slate-300"
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
                <p className="text-sm font-semibold text-slate-800">{fw}</p>
                <p className="mt-0.5 text-xs text-slate-500">{FRAMEWORK_INFO[fw]}</p>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Počáteční fáze</label>
          <select
            name="phase"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          >
            {["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Vytvářím..." : "Vytvořit projekt"}
        </button>
      </form>
    </main>
  );
}

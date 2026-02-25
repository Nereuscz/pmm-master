"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: String(formData.get("name") || ""),
        framework: String(formData.get("framework") || ""),
        phase: String(formData.get("phase") || ""),
        ownerId: String(formData.get("ownerId") || "") || undefined
      };
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Uložení projektu selhalo.");
      }
      router.push(`/projects/${json.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">Nový projekt</h1>
      <p className="mt-2 text-slate-600">
        Vytvoření projektu v databázi.
      </p>
      <form
        action={onSubmit}
        className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Název projektu</span>
          <input
            name="name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Např. Scale-up program 2026"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Framework</span>
          <select name="framework" className="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option>Univerzální</option>
            <option>Produktový</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Počáteční fáze</span>
          <select name="phase" className="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option>Iniciace</option>
            <option>Plánování</option>
            <option>Realizace</option>
            <option>Closing</option>
            <option>Gate 1</option>
            <option>Gate 2</option>
            <option>Gate 3</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Owner ID (UUID)</span>
          <input
            name="ownerId"
            defaultValue="00000000-0000-0000-0000-000000000001"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Ukládám..." : "Uložit projekt"}
        </button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </form>
    </main>
  );
}

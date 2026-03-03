"use client";

import { useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";

const PHASES = ["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"];

type CanvasQuestion = {
  name: string;
  hint: string;
  followUps: string[];
};

export default function CanvasPage() {
  const [userPrompt, setUserPrompt] = useState("");
  const [phase, setPhase] = useState("Iniciace");
  const [framework, setFramework] = useState<"Univerzální" | "Produktový">("Produktový");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<CanvasQuestion[] | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  async function handleGenerate(usePrompt = false) {
    setLoading(true);
    setError(null);
    setQuestions(null);

    try {
      const body = usePrompt && userPrompt.trim()
        ? { userPrompt: userPrompt.trim() }
        : { phase, framework };

      const r = await fetch("/api/guide/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await r.json();

      if (!r.ok) throw new Error(json.error || "Chyba generování");

      setQuestions(json.questions ?? []);
      setPhase(json.phase ?? phase);
      setFramework(json.framework ?? framework);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nepodařilo se vygenerovat canvas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Breadcrumbs
        items={[
          { label: "Projekty", href: "/dashboard" },
          { label: "Průvodce", href: "/guide" },
          { label: "Canvas" }
        ]}
      />
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
        Rozšířená sada PM otázek (Canvas)
      </h1>
      <p className="mt-1 text-[15px] text-[#6e6e73]">
        Zadej textový požadavek nebo vyber fázi a framework. Zobrazí se všechny základní otázky s 3 doplňujícími u každé.
      </p>

      {/* Textový vstup */}
      <div className="mt-6 space-y-4 rounded-apple bg-white p-6 shadow-apple">
        <div>
          <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
            Textový požadavek
          </label>
          <input
            type="text"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Např. Chci rozšířenou sadu otázek pro Produktový framework"
            className="w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
              Fáze
            </label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-[14px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            >
              {PHASES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
              Framework
            </label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value as "Univerzální" | "Produktový")}
              className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-[14px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            >
              <option>Univerzální</option>
              <option>Produktový</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleGenerate(true)}
            disabled={loading || !userPrompt.trim()}
            className="rounded-full bg-brand-600 px-5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Generuji…" : "Generovat z textu"}
          </button>
          <button
            onClick={() => handleGenerate(false)}
            disabled={loading}
            className="rounded-full border border-[#d2d2d7] px-5 py-2 text-[14px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:opacity-50"
          >
            Generovat z výběru
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl bg-[#fff2f2] px-4 py-3 text-[14px] text-[#c0392b]">
          {error}
        </div>
      ) : null}

      {/* Canvas s otázkami */}
      {questions && questions.length > 0 ? (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">
              Canvas – {framework} · {phase}
            </h2>
            <Link
              href="/guide"
              className="rounded-full bg-brand-600 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-700"
            >
              Spustit průvodce →
            </Link>
          </div>

          <div className="space-y-5 rounded-apple bg-white p-6 shadow-apple">
            {questions.map((q, i) => (
              <div
                key={i}
                className="rounded-xl border border-[#e8e8ed] bg-[#fafafa] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#f2f2f7]"
                >
                  <span className="text-[14px] font-semibold text-[#1d1d1f]">
                    🟨 {q.name}
                  </span>
                  <span className="text-[12px] text-[#aeaeb2]">
                    {expandedIndex === i ? "▲" : "▼"}
                  </span>
                </button>
                {expandedIndex === i ? (
                  <div className="border-t border-[#e8e8ed] bg-white px-4 py-4">
                    <p className="mb-3 text-[13px] text-[#6e6e73]">{q.hint}</p>
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#86868b]">
                      Doplňující otázky (3)
                    </p>
                    <ol className="space-y-2">
                      {q.followUps.map((fu, j) => (
                        <li key={j} className="flex gap-2 text-[13px] text-[#1d1d1f]">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                            {j + 1}
                          </span>
                          {fu}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";

const PHASES = ["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"];

type Project = { id: string; name: string; framework: string; phase: string };

type CanvasQuestion = {
  name: string;
  hint: string;
  context?: string;
  followUps: string[];
};

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

  const [userPrompt, setUserPrompt] = useState("");
  const [phase, setPhase] = useState("Iniciace");
  const [framework, setFramework] = useState<"Univerzální" | "Produktový">("Produktový");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<CanvasQuestion[] | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    const projectIdParam = new URLSearchParams(window.location.search).get("projectId");
    fetch("/api/projects")
      .then((r) => r.json())
      .then((json) => {
        const list: Project[] = json.projects ?? [];
        setProjects(list);
        const preselect = list.find((p) => p.id === projectIdParam) ?? list[0] ?? null;
        if (preselect) {
          setSelectedProject(preselect);
          setPhase(preselect.phase ?? "Iniciace");
          setFramework(preselect.framework as "Univerzální" | "Produktový");
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleGenerate(usePrompt = false) {
    setLoading(true);
    setError(null);
    setQuestions(null);

    try {
      const body = usePrompt && userPrompt.trim()
        ? { userPrompt: userPrompt.trim(), projectId: selectedProject?.id }
        : { phase, framework, projectId: selectedProject?.id };

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
      setExpandedIndex(null);
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
          { label: "Příprava na schůzku" }
        ]}
      />
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
        Příprava na schůzku
      </h1>
      <p className="mt-1 text-[15px] text-[#6e6e73]">
        Vygeneruj sadu PM otázek s doplňujícími pro konkrétní projekt a fázi — ideální podklad před živým rozhovorem.
      </p>

      {/* Konfigurace */}
      <div className="mt-6 space-y-4 rounded-apple bg-white p-6 shadow-apple">

        {/* Projekt */}
        <div>
          <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
            Projekt <span className="font-normal normal-case text-[#aeaeb2]">(volitelné – zpřesní otázky)</span>
          </label>
          <select
            value={selectedProject?.id ?? ""}
            onChange={(e) => {
              const p = projects.find((p) => p.id === e.target.value) ?? null;
              setSelectedProject(p);
              if (p) {
                setPhase(p.phase ?? "Iniciace");
                setFramework(p.framework as "Univerzální" | "Produktový");
              }
            }}
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-[14px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          >
            <option value="">– bez projektu –</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedProject && (
            <p className="mt-1 text-[12px] text-[#aeaeb2]">
              Framework projektu: {selectedProject.framework}
            </p>
          )}
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

        {/* Volitelný textový požadavek */}
        <div>
          <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
            Textový požadavek <span className="font-normal normal-case text-[#aeaeb2]">(volitelné)</span>
          </label>
          <input
            type="text"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Např. Chci rozšířenou sadu otázek pro Produktový framework – Realizace"
            className="w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleGenerate(false)}
            disabled={loading}
            className="rounded-full bg-brand-600 px-5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Generuji…" : "Vygenerovat podklady →"}
          </button>
          {userPrompt.trim() && (
            <button
              onClick={() => handleGenerate(true)}
              disabled={loading}
              className="rounded-full border border-[#d2d2d7] px-5 py-2 text-[14px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:opacity-50"
            >
              Generovat z textu
            </button>
          )}
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                {selectedProject ? selectedProject.name + " – " : ""}{framework} · {phase}
              </h2>
              <p className="text-[13px] text-[#6e6e73]">
                {questions.length} otázek · klikni pro rozbalení doplňujících
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => window.print()}
                className="rounded-full border border-[#d2d2d7] px-4 py-1.5 text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] print:hidden"
              >
                Tisknout / PDF
              </button>
              <Link
                href={selectedProject ? `/guide?projectId=${selectedProject.id}` : "/guide"}
                className="rounded-full bg-brand-600 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-700 print:hidden"
              >
                Spustit průvodce →
              </Link>
            </div>
          </div>

          <div className="space-y-3 rounded-apple bg-white p-6 shadow-apple print:shadow-none print:p-0">
            {questions.map((q, i) => (
              <div
                key={i}
                className="rounded-xl border border-[#e8e8ed] bg-[#fafafa] overflow-hidden print:border-0 print:rounded-none print:bg-white print:border-b print:border-[#e8e8ed]"
              >
                <button
                  type="button"
                  onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#f2f2f7] print:pointer-events-none print:hover:bg-transparent"
                >
                  <span className="text-[14px] font-semibold text-[#1d1d1f]">
                    🟨 {q.name}
                  </span>
                  <span className="text-[12px] text-[#aeaeb2] print:hidden">
                    {expandedIndex === i ? "▲" : "▼"}
                  </span>
                </button>

                {/* Na obrazovce: rozbalitelné. Při tisku: vždy viditelné. */}
                <div className={`border-t border-[#e8e8ed] bg-white px-4 py-4 ${expandedIndex === i ? "block" : "hidden"} print:block`}>
                  <p className="mb-2 text-[13px] text-[#6e6e73]">{q.hint}</p>
                  {q.context && (
                    <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
                      💡 {q.context}
                    </div>
                  )}
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#86868b]">
                    Doplňující otázky (3)
                  </p>
                  <ol className="space-y-2">
                    {q.followUps.map((fu, j) => (
                      <li key={j} className="flex gap-2 text-[13px] text-[#1d1d1f]">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 print:border print:border-[#d2d2d7] print:bg-white print:text-[#1d1d1f]">
                          {j + 1}
                        </span>
                        {fu}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}

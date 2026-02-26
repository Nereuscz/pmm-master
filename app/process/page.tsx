"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AiOutput from "@/components/AiOutput";

type ProcessResponse = {
  sessionId: string;
  output: string;
  meta: { lowKbConfidence: boolean; kbChunksUsed: number; changeSignals: string[] };
};
type Project = { id: string; name: string; framework: string; phase: string };

const PHASES = ["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"];

function ProcessForm() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((json) => {
        const list: Project[] = json.projects ?? [];
        setProjects(list);
        const preselected = list.find((p) => p.id === projectIdParam) ?? list[0] ?? null;
        setSelectedProject(preselected);
      })
      .catch(() => undefined);
  }, [projectIdParam]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProject || !transcript.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const data = new FormData(e.currentTarget);
    const payload = {
      projectId: selectedProject.id,
      phase: String(data.get("phase") || selectedProject.phase),
      framework: selectedProject.framework,
      transcript: transcript.trim()
    };

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Zpracování selhalo.");
      setResult(json as ProcessResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznámá chyba");
    } finally {
      setLoading(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTranscript(await file.text());
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      {/* Formulář */}
      <div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {projects.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Nejdřív vytvoř projekt v sekci Projekty.
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Projekt</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
              value={selectedProject?.id ?? ""}
              onChange={(e) => {
                const p = projects.find((p) => p.id === e.target.value) ?? null;
                setSelectedProject(p);
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedProject ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Fáze</label>
              <select
                name="phase"
                defaultValue={selectedProject.phase}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
              >
                {PHASES.map((p) => <option key={p}>{p}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-400">Framework: {selectedProject.framework}</p>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Transkript</label>
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-brand-600 hover:underline">
              <input type="file" accept=".txt" className="hidden" onChange={onFileChange} />
              ↑ Nahrát .txt soubor
            </label>
            <textarea
              rows={12}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
              placeholder="Vlož nebo nahraj transkript ze schůzky (min. 300 znaků)..."
            />
            <p className="mt-1 text-right text-xs text-slate-400">{transcript.length} znaků</p>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={loading || projects.length === 0 || transcript.length < 50}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Zpracovávám..." : "Zpracovat transkript"}
          </button>
        </form>
      </div>

      {/* Výstup */}
      <div>
        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <p className="text-sm text-slate-500">AI zpracovává transkript...</p>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>KB chunků: {result.meta.kbChunksUsed}</span>
              {result.meta.lowKbConfidence ? (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">
                  Nízká jistota KB
                </span>
              ) : null}
              {result.meta.changeSignals.length > 0 ? (
                <span className="rounded bg-orange-100 px-2 py-0.5 text-orange-700">
                  Změny v rozsahu
                </span>
              ) : null}
            </div>
            <AiOutput content={result.output} />
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white">
            <p className="text-sm text-slate-400">Výstup se zobrazí zde</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProcessPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Zpracovat transkript</h1>
        <p className="mt-1 text-sm text-slate-500">
          AI extrahuje strukturované PM výstupy dle zvoleného frameworku a fáze projektu.
        </p>
      </div>
      <Suspense fallback={<p className="text-slate-500">Načítám...</p>}>
        <ProcessForm />
      </Suspense>
    </main>
  );
}

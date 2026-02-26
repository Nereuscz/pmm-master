"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AiOutput from "@/components/AiOutput";

type ProcessResponse = {
  sessionId: string;
  output: string;
  meta: { lowKbConfidence: boolean; kbChunksUsed: number; changeSignals: string[] };
};
type Project = { id: string; name: string; framework: string; phase: string };

// Stavový automat průběhu zpracování
type Step = "idle" | "clarifying" | "answering" | "processing" | "done";

const PHASES = ["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"];

function ProcessForm() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedPhase, setSelectedPhase] = useState(PHASES[0]);
  const [transcript, setTranscript] = useState("");

  // Clarification state
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [clarifyingAnswers, setClarifyingAnswers] = useState("");

  // Payload pro finální zpracování
  const pendingPayloadRef = useRef<{
    projectId: string;
    phase: string;
    framework: string;
    transcript: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((json) => {
        const list: Project[] = json.projects ?? [];
        setProjects(list);
        const preselected = list.find((p) => p.id === projectIdParam) ?? list[0] ?? null;
        setSelectedProject(preselected);
        if (preselected) setSelectedPhase(preselected.phase ?? PHASES[0]);
      })
      .catch(() => undefined);
  }, [projectIdParam]);

  // Krok 1: Analyzovat transkript → získat doplňující otázky
  async function onAnalyze(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProject || !transcript.trim()) return;

    const payload = {
      projectId: selectedProject.id,
      phase: selectedPhase,
      framework: selectedProject.framework,
      transcript: transcript.trim()
    };
    pendingPayloadRef.current = payload;

    setStep("clarifying");
    setError(null);
    setResult(null);
    setClarifyingQuestions([]);
    setClarifyingAnswers("");

    try {
      const r = await fetch("/api/process/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await r.json();
      setClarifyingQuestions(json.questions ?? []);
      setStep("answering");
    } catch {
      // Pokud clarify selže, přejdeme rovnou ke zpracování
      setClarifyingQuestions([]);
      setStep("answering");
    }
  }

  // Krok 2: Finální zpracování (s odpověďmi nebo bez)
  async function onProcess(skip = false) {
    const base = pendingPayloadRef.current;
    if (!base) return;

    const answers = skip ? "" : clarifyingAnswers.trim();
    const finalTranscript = answers
      ? `${base.transcript}\n\n--- Doplňující odpovědi ---\n${answers}`
      : base.transcript;

    setStep("processing");
    setError(null);

    try {
      const r = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, transcript: finalTranscript })
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Zpracování selhalo.");
      setResult(json as ProcessResponse);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznámá chyba");
      setStep("answering");
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      // PDF a DOCX – pošleme jako FormData přes upload endpoint
      const fd = new FormData();
      fd.append("file", file);
      fetch("/api/kb/upload-parse", { method: "POST", body: fd })
        .then((r) => r.json())
        .then((json) => { if (json.text) setTranscript(json.text); })
        .catch(() => undefined);
    } else {
      file.text().then(setTranscript).catch(() => undefined);
    }
  }

  function resetForm() {
    setStep("idle");
    setResult(null);
    setError(null);
    setClarifyingQuestions([]);
    setClarifyingAnswers("");
    pendingPayloadRef.current = null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      {/* ── Levý panel ───────────────────────────────────────────────── */}
      <div className="space-y-4">

        {/* Formulář – viditelný jen v kroku idle */}
        {step === "idle" ? (
          <form
            onSubmit={onAnalyze}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
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
                  if (p) setSelectedPhase(p.phase ?? PHASES[0]);
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
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
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
                <input
                  type="file"
                  accept=".txt,.pdf,.docx,.doc,.md"
                  className="hidden"
                  onChange={onFileChange}
                />
                ↑ Nahrát soubor (TXT, PDF, DOCX)
              </label>
              <textarea
                rows={12}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
                placeholder="Vlož nebo nahraj transkript ze schůzky (min. 50 znaků)..."
              />
              <p className="mt-1 text-right text-xs text-slate-400">{transcript.length} znaků</p>
            </div>

            <button
              type="submit"
              disabled={projects.length === 0 || transcript.length < 50}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Analyzovat transkript →
            </button>
          </form>
        ) : null}

        {/* ── Krok: Načítám doplňující otázky ── */}
        {step === "clarifying" ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <p className="text-sm text-slate-500">AI analyzuje transkript a hledá nejasnosti...</p>
            </div>
          </div>
        ) : null}

        {/* ── Krok: Doplňující otázky ── */}
        {step === "answering" ? (
          <div className="space-y-4 rounded-xl border border-brand-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <h2 className="font-semibold text-slate-900">Doplňující otázky</h2>
            </div>
            <p className="text-sm text-slate-500">
              AI identifikovala nejasnosti v transkriptu. Odpověz na otázky níže nebo klikni na
              &ldquo;Přeskočit&rdquo; pro přímé zpracování.
            </p>

            {clarifyingQuestions.length > 0 ? (
              <ol className="space-y-1.5 text-sm text-slate-700">
                {clarifyingQuestions.map((q, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 rounded bg-brand-100 px-1.5 py-0.5 text-xs font-bold text-brand-700">
                      {i + 1}
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-400 italic">Transkript je dostatečně jasný – není třeba doplňovat.</p>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tvoje odpovědi{" "}
                <span className="font-normal text-slate-400">(volitelné – uveď číslo otázky)</span>
              </label>
              <textarea
                rows={5}
                value={clarifyingAnswers}
                onChange={(e) => setClarifyingAnswers(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
                placeholder="Např. 1. Jan Novák je PM projektu. 2. Cílový termín je Q3 2025..."
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) onProcess(); }}
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={() => onProcess(false)}
                className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Zpracovat finálně →
              </button>
              <button
                onClick={() => onProcess(true)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Přeskočit
              </button>
            </div>

            <button
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
            >
              ← Zpět na formulář
            </button>
          </div>
        ) : null}

        {/* ── Krok: Generuji výstup ── */}
        {step === "processing" ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <p className="text-sm text-slate-500">AI generuje PM dokumentaci...</p>
              <p className="mt-1 text-xs text-slate-400">Může trvat 15–30 sekund</p>
            </div>
          </div>
        ) : null}

        {/* ── Krok: Hotovo – reset tlačítko ── */}
        {step === "done" ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="mb-3 text-sm font-medium text-green-800">✅ Dokumentace vygenerována a uložena do projektu.</p>
            <button
              onClick={resetForm}
              className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
            >
              Zpracovat další transkript
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Pravý panel – výstup ───────────────────────────────────────── */}
      <div>
        {step === "processing" ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <p className="text-sm text-slate-500">Připravuji výstup...</p>
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
            <p className="text-sm text-slate-400">Výstup se zobrazí zde po zpracování</p>
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
          AI nejprve ověří nejasnosti, pak extrahuje strukturované PM výstupy dle zvoleného frameworku.
        </p>
      </div>
      <Suspense fallback={<p className="text-slate-500">Načítám...</p>}>
        <ProcessForm />
      </Suspense>
    </main>
  );
}

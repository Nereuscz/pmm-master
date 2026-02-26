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

  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [clarifyingAnswers, setClarifyingAnswers] = useState("");

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
      setClarifyingQuestions([]);
      setStep("answering");
    }
  }

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
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
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
      {/* ── Levý panel ── */}
      <div className="space-y-4">

        {/* Krok 1: Formulář */}
        {step === "idle" ? (
          <form onSubmit={onAnalyze} className="space-y-5 rounded-apple bg-white p-6 shadow-apple">
            {projects.length === 0 ? (
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
                Nejdřív vytvoř projekt v sekci Projekty.
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">Projekt</label>
              <select
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-[14px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
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
                <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">Fáze</label>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-[14px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                >
                  {PHASES.map((p) => <option key={p}>{p}</option>)}
                </select>
                <p className="mt-1.5 text-[12px] text-[#aeaeb2]">Framework: {selectedProject.framework}</p>
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">Transkript</label>
              <label className="mb-2 flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:text-brand-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <input type="file" accept=".txt,.pdf,.docx,.doc,.md" className="hidden" onChange={onFileChange} />
                Nahrát soubor (TXT, PDF, DOCX)
              </label>
              <textarea
                rows={12}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full resize-none rounded-xl border border-[#d2d2d7] px-4 py-3 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                placeholder="Vlož nebo nahraj transkript ze schůzky (min. 50 znaků)..."
              />
              <p className="mt-1 text-right text-[12px] text-[#aeaeb2]">{transcript.length} znaků</p>
            </div>

            <button
              type="submit"
              disabled={projects.length === 0 || transcript.length < 50}
              className="w-full rounded-full bg-brand-600 py-3 text-[15px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              Analyzovat transkript →
            </button>
          </form>
        ) : null}

        {/* Krok: Načítám doplňující otázky */}
        {step === "clarifying" ? (
          <div className="flex h-48 items-center justify-center rounded-apple bg-white shadow-apple">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <p className="text-[14px] text-[#6e6e73]">AI analyzuje transkript…</p>
            </div>
          </div>
        ) : null}

        {/* Krok: Doplňující otázky */}
        {step === "answering" ? (
          <div className="space-y-5 rounded-apple bg-white p-6 shadow-apple">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#86868b]">Doplňující otázky</p>
              <p className="mt-1 text-[14px] text-[#6e6e73]">
                Odpověz nebo klikni na &ldquo;Přeskočit&rdquo; pro přímé zpracování.
              </p>
            </div>

            {clarifyingQuestions.length > 0 ? (
              <ol className="space-y-2">
                {clarifyingQuestions.map((q, i) => (
                  <li key={i} className="flex gap-2.5 text-[14px] text-[#1d1d1f]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                      {i + 1}
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[14px] italic text-[#aeaeb2]">Transkript je dostatečně jasný.</p>
            )}

            <div>
              <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
                Tvoje odpovědi <span className="font-normal normal-case text-[#aeaeb2]">(volitelné)</span>
              </label>
              <textarea
                rows={5}
                value={clarifyingAnswers}
                onChange={(e) => setClarifyingAnswers(e.target.value)}
                className="w-full resize-none rounded-xl border border-[#d2d2d7] px-4 py-3 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                placeholder="Např. 1. Jan Novák je PM projektu. 2. Cílový termín je Q3 2025…"
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) onProcess(); }}
              />
            </div>

            {error ? (
              <div className="rounded-xl bg-[#fff2f2] px-4 py-3 text-[14px] text-[#c0392b]">{error}</div>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={() => onProcess(false)}
                className="flex-1 rounded-full bg-brand-600 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand-700"
              >
                Zpracovat finálně →
              </button>
              <button
                onClick={() => onProcess(true)}
                className="rounded-full border border-[#d2d2d7] px-5 py-2.5 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
              >
                Přeskočit
              </button>
            </div>

            <button onClick={resetForm} className="text-[13px] text-[#aeaeb2] hover:text-[#6e6e73]">
              ← Zpět na formulář
            </button>
          </div>
        ) : null}

        {/* Krok: Generuji */}
        {step === "processing" ? (
          <div className="flex h-48 items-center justify-center rounded-apple bg-white shadow-apple">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <p className="text-[14px] text-[#6e6e73]">AI generuje PM dokumentaci…</p>
              <p className="mt-1 text-[12px] text-[#aeaeb2]">Může trvat 15–30 sekund</p>
            </div>
          </div>
        ) : null}

        {/* Krok: Hotovo */}
        {step === "done" ? (
          <div className="rounded-apple bg-[#f0fdf4] p-5 shadow-apple-sm">
            <p className="mb-3 text-[14px] font-medium text-[#1a7f37]">✅ Dokumentace vygenerována a uložena do projektu.</p>
            <button
              onClick={resetForm}
              className="rounded-full border border-[#86efac] bg-white px-5 py-2 text-[14px] font-medium text-[#1a7f37] hover:bg-[#f0fdf4]"
            >
              Zpracovat další transkript
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Pravý panel – výstup ── */}
      <div>
        {step === "processing" ? (
          <div className="flex h-48 items-center justify-center rounded-apple bg-white shadow-apple">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <p className="text-[14px] text-[#6e6e73]">Připravuji výstup…</p>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f2f2f7] px-3 py-1 text-[12px] text-[#6e6e73]">
                KB chunků: {result.meta.kbChunksUsed}
              </span>
              {result.meta.lowKbConfidence ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[12px] text-amber-700">Nízká jistota KB</span>
              ) : null}
              {result.meta.changeSignals.length > 0 ? (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-[12px] text-orange-700">Změny v rozsahu</span>
              ) : null}
            </div>
            <AiOutput content={result.output} />
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-apple bg-white shadow-apple">
            <p className="text-[14px] text-[#aeaeb2]">Výstup se zobrazí zde po zpracování</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProcessPage() {
  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">Zpracovat transkript</h1>
        <p className="mt-1 text-[15px] text-[#6e6e73]">
          AI nejprve ověří nejasnosti, pak extrahuje strukturované PM výstupy dle zvoleného frameworku.
        </p>
      </div>
      <Suspense fallback={<p className="text-[#6e6e73]">Načítám…</p>}>
        <ProcessForm />
      </Suspense>
    </main>
  );
}

"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import AiOutput from "@/components/AiOutput";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Spinner } from "@/components/LoadingState";
import { parsePmOutputIntoSections } from "@/lib/pm-output-parser";

type ProcessResponse = {
  sessionId: string;
  output: string;
  meta: { lowKbConfidence: boolean; kbChunksUsed: number; changeSignals: string[] };
};
type Project = { id: string; name: string; framework: string; phase: string; asana_project_id?: string | null };

type Step = "confirm_context" | "idle" | "clarifying" | "answering" | "processing" | "done";

const PHASES = ["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"];

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function ProcessForm() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");

  const [step, setStep] = useState<Step>("confirm_context");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedPhase, setSelectedPhase] = useState(PHASES[0]);
  const [transcript, setTranscript] = useState("");

  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [clarifyingAnswers, setClarifyingAnswers] = useState("");
  const [contextNote, setContextNote] = useState("");
  const [fileUploadState, setFileUploadState] = useState<"idle" | "loading" | "error">("idle");
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [hasAsanaToken, setHasAsanaToken] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);

  // Iterativní doladění
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [refining, setRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);
  const [showRefinement, setShowRefinement] = useState(false);

  const pendingPayloadRef = useRef<{
    projectId: string;
    phase: string;
    framework: string;
    transcript: string;
    contextNote?: string;
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

  // Přeskočit krok "Ověření kontextu" při příchodu z detailu projektu (projectId v URL)
  useEffect(() => {
    if (
      projectIdParam &&
      selectedProject?.id === projectIdParam &&
      projects.length > 0
    ) {
      setStep((s) => (s === "confirm_context" ? "idle" : s));
    }
  }, [projectIdParam, selectedProject?.id, projects.length]);

  useEffect(() => {
    fetch("/api/settings/asana-token")
      .then((r) => r.json())
      .then((json) => setHasAsanaToken(json.hasToken === true))
      .catch(() => setHasAsanaToken(false));
  }, []);

  async function onAnalyze(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProject || !transcript.trim()) return;

    const payload = {
      projectId: selectedProject.id,
      phase: selectedPhase,
      framework: selectedProject.framework,
      transcript: transcript.trim(),
      contextNote: contextNote.trim() || undefined
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

    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const needsServerParse = ["pdf", "docx", "doc"].includes(ext);

    if (needsServerParse) {
      setFileUploadState("loading");
      setFileUploadError(null);
      const fd = new FormData();
      fd.append("file", file);
      fetch("/api/kb/upload-parse", { method: "POST", body: fd })
        .then((r) => r.json())
        .then((json) => {
          if (json.error) {
            setFileUploadState("error");
            setFileUploadError(json.error);
          } else if (json.text != null) {
            setTranscript(json.text);
            setFileUploadState("idle");
            setFileUploadError(null);
          } else {
            setFileUploadState("idle");
          }
        })
        .catch(() => {
          setFileUploadState("error");
          setFileUploadError("Nepodařilo se načíst soubor.");
        });
    } else {
      setFileUploadState("idle");
      setFileUploadError(null);
      file.text().then(setTranscript).catch(() => {
        setFileUploadError("Nepodařilo se načíst soubor.");
      });
    }
  }

  function resetForm() {
    setStep("confirm_context");
    setResult(null);
    setError(null);
    setClarifyingQuestions([]);
    setClarifyingAnswers("");
    setContextNote("");
    setRefinementPrompt("");
    setRefinementError(null);
    setShowRefinement(false);
    pendingPayloadRef.current = null;
  }

  function onConfirmContext() {
    if (!selectedProject) return;
    setStep("idle");
  }

  async function handleExportToAsana() {
    if (!result || !selectedProject?.asana_project_id) return;
    setExporting(true);
    try {
      const sections = parsePmOutputIntoSections(result.output);
      const r = await fetch("/api/asana/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: result.sessionId,
          asanaProjectId: selectedProject.asana_project_id,
          idempotencyKey: `export-${result.sessionId}`,
          title: `${selectedProject.name} – ${selectedPhase}`,
          sections,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Export selhal.");
      toast.success("Export do Asany odeslán.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export selhal.");
    } finally {
      setExporting(false);
    }
  }

  async function handleRefine() {
    if (!result || !selectedProject || !refinementPrompt.trim()) return;
    setRefining(true);
    setRefinementError(null);
    try {
      const r = await fetch("/api/process/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: result.sessionId,
          projectId: selectedProject.id,
          phase: selectedPhase,
          framework: selectedProject.framework,
          existingOutput: result.output,
          refinementPrompt: refinementPrompt.trim()
        })
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Doladění selhalo.");
      setResult((prev) => prev ? { ...prev, output: json.content } : prev);
      setRefinementPrompt("");
      toast.success("Výstup byl doladen.");
    } catch (e) {
      setRefinementError(e instanceof Error ? e.message : "Neznámá chyba");
    } finally {
      setRefining(false);
    }
  }

  const steps = [
    { label: "Ověření kontextu", key: "confirm_context" as const },
    { label: "Transkript", key: "idle" as const },
    { label: "Doplňující otázky", key: "answering" as const },
    { label: "Zpracování", key: "processing" as const },
    { label: "Hotovo", key: "done" as const },
  ];
  const stepIndex =
    step === "confirm_context" ? 0
    : step === "idle" ? 1
    : step === "clarifying" || step === "answering" ? 2
    : step === "processing" ? 3
    : 4;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      {/* ── Levý panel ── */}
      <div className="space-y-4">
        {/* Step indikátor */}
        <div className="flex items-center gap-2 rounded-apple bg-white px-4 py-3 shadow-apple-sm">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  i < stepIndex
                    ? "bg-brand-600 text-white"
                    : i === stepIndex
                      ? "bg-brand-100 text-brand-700 ring-2 ring-brand-600/30"
                      : "bg-[#f2f2f7] text-[#aeaeb2]"
                }`}
              >
                {i < stepIndex ? "✓" : i + 1}
              </span>
              <span
                className={`hidden text-[12px] font-medium sm:inline ${
                  i <= stepIndex ? "text-[#1d1d1f]" : "text-[#aeaeb2]"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 ? (
                <span className="mx-1 hidden h-px w-4 bg-[#e8e8ed] sm:block" aria-hidden />
              ) : null}
            </div>
          ))}
        </div>

        {/* Krok 0: Kontextové ověření */}
        {step === "confirm_context" ? (
          <div className="space-y-5 rounded-apple bg-white p-6 shadow-apple">
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-brand-700">
                Před zpracováním potřebuji potvrdit
              </p>
              <p className="mt-2 text-[14px] text-[#1d1d1f]">
                1) V jaké fázi PM se projekt nachází?<br />
                2) Jaký typ frameworku použijeme? (Univerzální vs. Produktový)
              </p>
              <p className="mt-3 text-[13px] text-[#6e6e73]">
                Nevytvářím dokument, dokud nepotvrdíte.
              </p>
            </div>
            {projects.length === 0 ? (
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
                Nejdřív vytvoř projekt v sekci Projekty.
              </div>
            ) : (
              <>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">Fáze PM</label>
                    <select
                      value={selectedPhase}
                      onChange={(e) => setSelectedPhase(e.target.value)}
                      className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-[14px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                    >
                      {PHASES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">Framework</label>
                    <p className="rounded-xl border border-[#e8e8ed] bg-[#fafafa] px-4 py-2.5 text-[14px] text-[#6e6e73]">
                      {selectedProject?.framework ?? "–"}
                    </p>
                    <p className="mt-1 text-[12px] text-[#aeaeb2]">Framework se mění v nastavení projektu</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onConfirmContext}
                  className="w-full rounded-full bg-brand-600 py-3 text-[15px] font-medium text-white transition-colors hover:bg-brand-700"
                >
                  Potvrdit a pokračovat →
                </button>
              </>
            )}
          </div>
        ) : null}

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
                placeholder="Vlož nebo nahraj transkript ze schůzky (min. 300, max. 50 000 znaků)..."
              />
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[12px] text-[#aeaeb2]">
                  {fileUploadState === "loading" && "Načítám soubor…"}
                  {fileUploadState === "error" && fileUploadError && (
                    <span className="text-red-600">{fileUploadError}</span>
                  )}
                </span>
                <span className="text-[12px] text-[#aeaeb2]">
                {transcript.length} znaků
                {transcript.length > 0 && (transcript.length < 300 || transcript.length > 50000) ? (
                  <span className="ml-2 text-amber-600">
                    (min. 300, max. 50 000)
                  </span>
                ) : null}
              </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
                Poznámka k záznamu <span className="font-normal normal-case text-[#aeaeb2]">(volitelné)</span>
              </label>
              <textarea
                rows={2}
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                maxLength={600}
                className="w-full resize-none rounded-xl border border-[#d2d2d7] px-4 py-3 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                placeholder='Např. "Relevantní část od 15. minuty" nebo "Zaměř se na diskusi o cílové skupině"'
              />
              {contextNote.length > 0 && (
                <p className="mt-1 text-right text-[12px] text-[#aeaeb2]">{contextNote.length}/600</p>
              )}
            </div>

            <button
              type="submit"
              disabled={projects.length === 0 || transcript.length < 300 || transcript.length > 50000}
              className="w-full rounded-full bg-brand-600 py-3 text-[15px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              Analyzovat transkript →
            </button>
          </form>
        ) : null}

        {/* Krok: Načítám doplňující otázky */}
        {step === "clarifying" ? (
          <div className="flex h-48 items-center justify-center rounded-apple bg-white shadow-apple">
            <Spinner message="AI analyzuje transkript…" />
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
              <div className="space-y-2 rounded-xl bg-[#fff2f2] px-4 py-3">
                <p className="text-[14px] text-[#c0392b]">{error}</p>
                <button
                  type="button"
                  onClick={() => onProcess(false)}
                  className="rounded-full border border-[#c0392b] bg-white px-4 py-2 text-[13px] font-medium text-[#c0392b] hover:bg-[#fff2f2]"
                >
                  Zkus znovu
                </button>
              </div>
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
            <Spinner message="AI generuje PM dokumentaci… Může trvat 15–30 sekund" />
          </div>
        ) : null}

        {/* Krok: Hotovo */}
        {step === "done" ? (
          <div className="space-y-3">
            <div className="rounded-apple bg-[#f0fdf4] p-5 shadow-apple-sm">
              <p className="mb-3 text-[14px] font-medium text-[#1a7f37]">✅ Dokumentace vygenerována a uložena do projektu.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={resetForm}
                  className="rounded-full border border-[#86efac] bg-white px-5 py-2 text-[14px] font-medium text-[#1a7f37] hover:bg-[#f0fdf4]"
                >
                  Zpracovat další transkript
                </button>
                {hasAsanaToken && selectedProject?.asana_project_id ? (
                  <button
                    onClick={handleExportToAsana}
                    disabled={exporting}
                    className="rounded-full bg-[#1a7f37] px-5 py-2 text-[14px] font-medium text-white hover:bg-[#15803d] disabled:opacity-50"
                  >
                    {exporting ? "Exportuji…" : "Exportovat do Asany"}
                  </button>
                ) : hasAsanaToken && selectedProject ? (
                  <a
                    href={`/projects/${selectedProject.id}`}
                    className="rounded-full border border-[#86efac] bg-white px-5 py-2 text-[14px] font-medium text-[#1a7f37] hover:bg-[#f0fdf4]"
                  >
                    Propojit projekt s Asanou →
                  </a>
                ) : null}
              </div>
            </div>

            {/* Iterativní doladění */}
            <div className="rounded-apple bg-white shadow-apple-sm">
              <button
                type="button"
                onClick={() => setShowRefinement((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div>
                  <p className="text-[14px] font-semibold text-[#1d1d1f]">✏️ Doladit výstup</p>
                  <p className="text-[12px] text-[#6e6e73]">Doplň nebo přepiš konkrétní sekce — AI zachová zbytek</p>
                </div>
                <span className="text-[12px] text-[#aeaeb2]">{showRefinement ? "▲" : "▼"}</span>
              </button>

              {showRefinement ? (
                <div className="border-t border-[#f2f2f7] px-5 pb-5 pt-4 space-y-3">
                  <textarea
                    rows={3}
                    value={refinementPrompt}
                    onChange={(e) => setRefinementPrompt(e.target.value)}
                    maxLength={1000}
                    placeholder='Např. "Přidej sekci Rizika", "Doplň RACI pro Jana Nováka", "Přepiš Výsledky – chybí konkrétní změna u klienta"'
                    className="w-full resize-none rounded-xl border border-[#d2d2d7] px-4 py-3 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                  {refinementError ? (
                    <p className="text-[13px] text-red-600">{refinementError}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleRefine}
                    disabled={refining || !refinementPrompt.trim()}
                    className="rounded-full bg-brand-600 px-5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                  >
                    {refining ? "Doladuji…" : "Regenerovat →"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Pravý panel – výstup (na mobilu skrytý dokud není výsledek nebo processing) ── */}
      <div className={!result && step !== "processing" ? "hidden lg:block" : ""}>
        {step === "processing" ? (
          <div className="flex h-48 items-center justify-center rounded-apple bg-white shadow-apple">
            <Spinner message="Připravuji výstup…" />
          </div>
        ) : result ? (
          <div className="space-y-3">
            {result.meta.lowKbConfidence ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-[14px] font-medium text-amber-800">Nenalezen dostatečný interní kontext</p>
                  <p className="mt-0.5 text-[13px] text-amber-700">
                    Výstup vznikl bez relevantních dokumentů ze znalostní báze. Pro přesnější výsledky doplňte dokumenty v sekci Znalostní báze.
                  </p>
                  <Link href="/kb" className="mt-2 inline-block text-[13px] font-medium text-amber-800 underline hover:text-amber-900">
                    Přejít do Znalostní báze →
                  </Link>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f2f2f7] px-3 py-1 text-[12px] text-[#6e6e73]">
                KB chunků: {result.meta.kbChunksUsed}
              </span>
              {result.meta.changeSignals.length > 0 ? (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-[12px] text-orange-700">Změny v rozsahu</span>
              ) : null}
            </div>
            <AiOutput
              content={result.output}
              downloadFilename={selectedProject ? `pm-vystup-${sanitizeFilename(selectedProject.name)}` : "pm-vystup"}
              sessionId={result.sessionId}
            />
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
        <Breadcrumbs items={[{ label: "Projekty", href: "/dashboard" }, { label: "Zpracovat" }]} />
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">Zpracovat transkript</h1>
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

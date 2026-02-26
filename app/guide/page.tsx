"use client";

import { useEffect, useState } from "react";
import AiOutput from "@/components/AiOutput";

type Project = { id: string; name: string; framework: string; phase: string };
type Answer = { questionId: string; question: string; answer: string };
type GuideQuestion = { id: string; text: string; hint: string };

type FollowUpState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; questions: string[]; answers: Record<number, string> };

const PHASES = ["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"];

export default function GuidePage() {
  // ── State ────────────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [phase, setPhase] = useState("Iniciace");
  const [framework, setFramework] = useState<"Univerzální" | "Produktový">("Univerzální");

  const [questions, setQuestions] = useState<GuideQuestion[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");

  // Odpověď čekající na dokončení follow-up bloku
  const [pendingMain, setPendingMain] = useState<{
    question: GuideQuestion;
    answer: string;
  } | null>(null);
  const [followUp, setFollowUp] = useState<FollowUpState>({ status: "idle" });

  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  // ── Načtení projektů ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((json) => {
        const list: Project[] = json.projects ?? [];
        setProjects(list);
        if (list[0]) {
          setSelectedProject(list[0]);
          setPhase(list[0].phase);
          setFramework(list[0].framework as "Univerzální" | "Produktový");
        }
      })
      .catch(() => undefined);
  }, []);

  // Restart při změně fáze/frameworku
  useEffect(() => {
    if (!started) return;
    setQuestions([]);
    setAnswers([]);
    setCurrentAnswer("");
    setFollowUp({ status: "idle" });
    setPendingMain(null);
    setFinalOutput(null);
    fetchNextQuestion([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, framework]);

  // ── Načtení další otázky (nebo finálního výstupu) ────────────────────────────
  async function fetchNextQuestion(currentAnswers: Answer[]) {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const r = await fetch("/api/guide/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          phase,
          framework,
          answers: currentAnswers
        })
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Průvodce selhal.");
      if (json.done) {
        setFinalOutput(json.output);
      } else {
        setQuestions((prev) => {
          const exists = prev.find((q) => q.id === json.nextQuestion.id);
          return exists ? prev : [...prev, json.nextQuestion];
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba");
    } finally {
      setLoading(false);
    }
  }

  // ── Start průvodce ───────────────────────────────────────────────────────────
  function handleStart() {
    if (!selectedProject) return;
    setStarted(true);
    setAnswers([]);
    setQuestions([]);
    setCurrentAnswer("");
    setFollowUp({ status: "idle" });
    setPendingMain(null);
    setFinalOutput(null);
    setError(null);
    fetchNextQuestion([]);
  }

  // ── Odeslání hlavní odpovědi → spustí follow-up otázky ──────────────────────
  async function submitMainAnswer() {
    const currentQ = questions[answers.length];
    if (!currentQ || !currentAnswer.trim() || !selectedProject) return;

    const mainAnswer = currentAnswer.trim();
    setCurrentAnswer("");
    setPendingMain({ question: currentQ, answer: mainAnswer });
    setFollowUp({ status: "loading" });

    try {
      const r = await fetch("/api/guide/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionName: currentQ.text,
          questionHint: currentQ.hint,
          userAnswer: mainAnswer,
          framework,
          phase
        })
      });
      const json = await r.json();
      const followUps: string[] = json.followUps ?? [];

      if (followUps.length > 0) {
        setFollowUp({ status: "ready", questions: followUps, answers: {} });
      } else {
        // Žádné follow-up → přejdi rovnou dál
        setFollowUp({ status: "idle" });
        setPendingMain(null);
        await advanceToNext(currentQ, mainAnswer, {});
      }
    } catch {
      // Chyba follow-up není fatální
      setFollowUp({ status: "idle" });
      setPendingMain(null);
      await advanceToNext(currentQ, mainAnswer, {});
    }
  }

  // ── Pokračovat po vyplnění (nebo přeskočení) follow-up otázek ────────────────
  async function handleContinue() {
    if (!pendingMain) return;
    const { question, answer } = pendingMain;
    const fuAnswers = followUp.status === "ready" ? followUp.answers : {};
    setFollowUp({ status: "idle" });
    setPendingMain(null);
    await advanceToNext(question, answer, fuAnswers);
  }

  // ── Posun na další otázku (ukládá odpověď včetně follow-up) ─────────────────
  async function advanceToNext(
    question: GuideQuestion,
    mainAnswer: string,
    fuAnswers: Record<number, string>
  ) {
    const fuLines = Object.entries(fuAnswers)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `(Doplněk ${Number(k) + 1}: ${v.trim()})`)
      .join(" ");

    const combined = fuLines ? `${mainAnswer} ${fuLines}` : mainAnswer;

    const nextAnswers: Answer[] = [
      ...answers,
      { questionId: question.id, question: question.text, answer: combined }
    ];
    setAnswers(nextAnswers);
    await fetchNextQuestion(nextAnswers);
  }

  // ── Odvozené hodnoty ─────────────────────────────────────────────────────────
  const currentQ = questions[answers.length] ?? null;
  const showMainQ = currentQ && !loading && followUp.status === "idle" && !pendingMain;
  const totalQuestions = questions.length;
  const answeredCount = answers.length;
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Průvodce PM otázkami</h1>
        <p className="mt-1 text-sm text-slate-500">
          AI klade otázky dle fáze projektu. Po každé odpovědi nabídne 3 doplňující otázky pro
          hlubší výstup.
        </p>
      </div>

      {/* ── Konfigurace (před startem / po dokončení) ──────────────────────────── */}
      {!started || finalOutput ? (
        <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Projekt</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={selectedProject?.id ?? ""}
                onChange={(e) => {
                  const p = projects.find((p) => p.id === e.target.value) ?? null;
                  setSelectedProject(p);
                  if (p) {
                    setPhase(p.phase);
                    setFramework(p.framework as "Univerzální" | "Produktový");
                  }
                }}
              >
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Fáze</label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {PHASES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Framework</label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value as "Univerzální" | "Produktový")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option>Univerzální</option>
                <option>Produktový</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleStart}
            disabled={!selectedProject}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {finalOutput ? "Spustit znovu" : "Spustit průvodce"}
          </button>
        </div>
      ) : null}

      {/* ── Průběh průvodce ────────────────────────────────────────────────────── */}
      {started && !finalOutput ? (
        <div className="space-y-5">
          {/* Progress bar */}
          {totalQuestions > 0 ? (
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Otázka {Math.min(answeredCount + 1, totalQuestions)} z {totalQuestions}</span>
                <span>{progress} %</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* Zodpovězené otázky */}
          {answers.length > 0 ? (
            <div className="space-y-2">
              {answers.map((a, i) => (
                <div key={i} className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <p className="font-medium text-slate-700">{a.question}</p>
                  <p className="mt-1 text-slate-500">{a.answer}</p>
                </div>
              ))}
            </div>
          ) : null}

          {/* Follow-up blok – načítání */}
          {followUp.status === "loading" ? (
            <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <span className="text-sm text-brand-700">Generuji doplňující otázky...</span>
            </div>
          ) : null}

          {/* Follow-up blok – 3 otázky připraveny */}
          {followUp.status === "ready" ? (
            <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50 p-5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-brand-800">💬 Doplňující otázky</span>
                <span className="text-xs text-brand-600">(volitelné – prohloubí výstup)</span>
              </div>
              <div className="space-y-3">
                {followUp.questions.map((q, i) => (
                  <div key={i} className="rounded-lg border border-brand-100 bg-white p-3">
                    <p className="mb-1.5 text-sm text-slate-700">
                      <span className="mr-2 inline-block rounded bg-brand-100 px-1.5 py-0.5 text-xs font-bold text-brand-700">
                        {i + 1}
                      </span>
                      {q}
                    </p>
                    <textarea
                      rows={2}
                      value={followUp.answers[i] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFollowUp((prev) =>
                          prev.status === "ready"
                            ? { ...prev, answers: { ...prev.answers, [i]: val } }
                            : prev
                        );
                      }}
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
                      placeholder="Volitelná odpověď..."
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleContinue}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Přejít na další otázku →
              </button>
            </div>
          ) : null}

          {/* Aktuální hlavní otázka */}
          {showMainQ ? (
            <div className="rounded-xl border border-brand-200 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-600">
                🟨 {currentQ.text}
              </p>
              <p className="mb-3 text-sm text-slate-500">{currentQ.hint}</p>
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
                placeholder="Tvoje odpověď..."
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) submitMainAnswer(); }}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={submitMainAnswer}
                  disabled={!currentAnswer.trim() || loading}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Odpovědět →
                </button>
                <span className="text-xs text-slate-400">nebo Cmd+Enter</span>
              </div>
            </div>
          ) : loading && followUp.status === "idle" ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <span className="text-sm text-slate-500">
                {answeredCount > 0 && answeredCount >= totalQuestions - 1
                  ? "AI generuje výstup..."
                  : "Načítám další otázku..."}
              </span>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Finální výstup ─────────────────────────────────────────────────────── */}
      {finalOutput ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Výstup průvodce</h2>
          <AiOutput content={finalOutput} />
        </div>
      ) : null}
    </main>
  );
}

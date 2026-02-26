"use client";

import { useEffect, useState } from "react";
import AiOutput from "@/components/AiOutput";

type Project = { id: string; name: string; framework: string; phase: string };
type Answer = { questionId: string; question: string; answer: string };
type GuideQuestion = { id: string; text: string; hint: string };

const PHASES = ["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"];

export default function GuidePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [phase, setPhase] = useState("Iniciace");
  const [framework, setFramework] = useState<"Univerzální" | "Produktový">("Univerzální");

  const [questions, setQuestions] = useState<GuideQuestion[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

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

  // Načti otázky když se změní phase/framework
  useEffect(() => {
    if (!started) return;
    setQuestions([]);
    setAnswers([]);
    setCurrentAnswer("");
    setFinalOutput(null);
    // Získej první otázku
    fetchNextQuestion([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, framework]);

  async function fetchNextQuestion(currentAnswers: Answer[]) {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const response = await fetch("/api/guide/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, phase, framework, answers: currentAnswers })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Průvodce selhal.");
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

  function handleStart() {
    if (!selectedProject) return;
    setStarted(true);
    setAnswers([]);
    setQuestions([]);
    setCurrentAnswer("");
    setFinalOutput(null);
    setError(null);
    fetchNextQuestion([]);
  }

  async function submitAnswer() {
    const currentQ = questions[answers.length];
    if (!currentQ || !currentAnswer.trim() || !selectedProject) return;
    const nextAnswers: Answer[] = [
      ...answers,
      { questionId: currentQ.id, question: currentQ.text, answer: currentAnswer.trim() }
    ];
    setAnswers(nextAnswers);
    setCurrentAnswer("");
    await fetchNextQuestion(nextAnswers);
  }

  const currentQ = questions[answers.length] ?? null;
  const progress = questions.length > 0 ? Math.round((answers.length / questions.length) * 100) : 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Průvodce PM otázkami</h1>
        <p className="mt-1 text-sm text-slate-500">
          AI klade otázky dle fáze projektu a na konci vygeneruje strukturovaný výstup.
        </p>
      </div>

      {/* Konfigurace */}
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
                  if (p) { setPhase(p.phase); setFramework(p.framework as "Univerzální" | "Produktový"); }
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

      {/* Průběh */}
      {started && !finalOutput ? (
        <div className="space-y-5">
          {/* Progress bar */}
          {questions.length > 0 ? (
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Otázka {answers.length + 1} z {questions.length}</span>
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

          {/* Aktuální otázka */}
          {currentQ && !loading ? (
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
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) submitAnswer(); }}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={submitAnswer}
                  disabled={!currentAnswer.trim() || loading}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Další →
                </button>
                <span className="text-xs text-slate-400">nebo Cmd+Enter</span>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <span className="text-sm text-slate-500">
                {answers.length > 0 && answers.length >= questions.length - 1
                  ? "AI generuje výstup..."
                  : "Načítám další otázku..."}
              </span>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}
        </div>
      ) : null}

      {/* Finální výstup */}
      {finalOutput ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Výstup průvodce</h2>
          </div>
          <AiOutput content={finalOutput} />
        </div>
      ) : null}
    </main>
  );
}

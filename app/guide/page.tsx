"use client";

import { useEffect, useState } from "react";

type Project = { id: string; name: string };
type Answer = { questionId: string; question: string; answer: string };

export default function GuidePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [phase, setPhase] = useState("Plánování");
  const [framework, setFramework] = useState<"Univerzální" | "Produktový">("Univerzální");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("Jaký je hlavní cíl aktuální fáze?");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((json) => {
        const list = (json.projects ?? []) as Project[];
        setProjects(list);
        if (list[0]) {
          setProjectId(list[0].id);
        }
      })
      .catch(() => undefined);
  }, []);

  async function submitAnswer() {
    if (!projectId || !currentAnswer.trim()) {
      return;
    }
    setLoading(true);
    setError(null);

    const nextAnswers = [
      ...answers,
      {
        questionId: `q_${answers.length + 1}`,
        question: currentQuestion,
        answer: currentAnswer.trim()
      }
    ];

    try {
      const response = await fetch("/api/guide/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phase,
          framework,
          answers: nextAnswers
        })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Průvodce selhal.");
      }
      setAnswers(nextAnswers);
      setCurrentAnswer("");
      if (json.done) {
        setFinalOutput(json.output);
      } else {
        setCurrentQuestion(json.nextQuestion.text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold">Průvodce otázkami</h1>
      <p className="mt-2 text-slate-600">
        AI průvodce po krocích dle fáze PM. Výstup uloží session do projektu.
      </p>

      <section className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            {["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value as "Univerzální" | "Produktový")}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option>Univerzální</option>
            <option>Produktový</option>
          </select>
        </div>

        {!finalOutput ? (
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium">{currentQuestion}</p>
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              rows={5}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <button
              type="button"
              disabled={loading || !projectId}
              onClick={submitAnswer}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Odesílám..." : "Odeslat odpověď"}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-3 font-semibold">Finální výstup</h2>
            <pre className="whitespace-pre-wrap text-sm">{finalOutput}</pre>
          </div>
        )}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </section>
    </main>
  );
}

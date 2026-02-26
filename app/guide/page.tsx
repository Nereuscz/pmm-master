"use client";

import { useEffect, useRef, useState } from "react";
import AiOutput from "@/components/AiOutput";

// ─── Typy ─────────────────────────────────────────────────────────────────────

type Project = { id: string; name: string; framework: string; phase: string };
type Answer = { questionId: string; question: string; answer: string };
type GuideQ = { id: string; text: string; hint: string };

type ChatMsg =
  | { id: string; role: "ai"; kind: "question"; q: GuideQ }
  | { id: string; role: "ai"; kind: "thinking"; text: string }
  | { id: string; role: "ai"; kind: "followup"; questions: string[]; answers: Record<number, string>; submitted: boolean }
  | { id: string; role: "ai"; kind: "output"; content: string }
  | { id: string; role: "ai"; kind: "error"; text: string }
  | { id: string; role: "user"; text: string };

type Status =
  | "idle"
  | "loading_q"
  | "awaiting_answer"
  | "loading_fu"
  | "awaiting_fu"
  | "done";

const PHASES = ["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"];

let _id = 0;
function uid() { return `m${++_id}`; }

// ─── Avatar komponenta ─────────────────────────────────────────────────────────

function AiAvatar() {
  return (
    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white shadow-sm">
      AI
    </div>
  );
}

// ─── Hlavní komponenta ─────────────────────────────────────────────────────────

export default function GuidePage() {
  // Config
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [phase, setPhase] = useState("Iniciace");
  const [framework, setFramework] = useState<"Univerzální" | "Produktový">("Univerzální");
  const [started, setStarted] = useState(false);

  // Chat
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQ, setCurrentQ] = useState<GuideQ | null>(null);
  const [pendingMain, setPendingMain] = useState<{ q: GuideQ; answer: string } | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Projekty ────────────────────────────────────────────────────────────────

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

  // ── Auto-scroll ─────────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function push(msg: ChatMsg) {
    setMessages((prev) => [...prev, msg]);
  }

  function removeThinking() {
    setMessages((prev) => prev.filter((m) => !(m.role === "ai" && m.kind === "thinking")));
  }

  // ── Načtení další otázky nebo finálního výstupu ─────────────────────────────

  async function fetchNextQuestion(currentAnswers: Answer[]) {
    if (!selectedProject) return;
    setStatus("loading_q");
    push({ id: uid(), role: "ai", kind: "thinking", text: "Načítám další otázku..." });

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
      removeThinking();

      if (!r.ok) throw new Error(json.error || "Chyba průvodce");

      if (json.done) {
        push({ id: uid(), role: "ai", kind: "output", content: json.output });
        setStatus("done");
      } else {
        const q: GuideQ = json.nextQuestion;
        setCurrentQ(q);
        push({ id: uid(), role: "ai", kind: "question", q });
        setStatus("awaiting_answer");
        setTimeout(() => inputRef.current?.focus(), 80);
      }
    } catch (e) {
      removeThinking();
      push({ id: uid(), role: "ai", kind: "error", text: e instanceof Error ? e.message : "Neznámá chyba" });
      setStatus("awaiting_answer");
    }
  }

  // ── Start ───────────────────────────────────────────────────────────────────

  function handleStart() {
    if (!selectedProject) return;
    setStarted(true);
    setMessages([]);
    setAnswers([]);
    setCurrentQ(null);
    setPendingMain(null);
    setInputValue("");
    setStatus("idle");
    fetchNextQuestion([]);
  }

  // ── Odeslání odpovědi → fetch follow-up ────────────────────────────────────

  async function handleSend() {
    if (!inputValue.trim() || !currentQ || status !== "awaiting_answer") return;

    const answer = inputValue.trim();
    setInputValue("");

    push({ id: uid(), role: "user", text: answer });

    const pending = { q: currentQ, answer };
    setPendingMain(pending);
    setCurrentQ(null);
    setStatus("loading_fu");
    push({ id: uid(), role: "ai", kind: "thinking", text: "Generuji doplňující otázky..." });

    try {
      const r = await fetch("/api/guide/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionName: pending.q.text,
          questionHint: pending.q.hint,
          userAnswer: answer,
          framework,
          phase
        })
      });
      const json = await r.json();
      removeThinking();
      const fus: string[] = json.followUps ?? [];

      if (fus.length > 0) {
        push({ id: uid(), role: "ai", kind: "followup", questions: fus, answers: {}, submitted: false });
        setStatus("awaiting_fu");
      } else {
        setPendingMain(null);
        await advanceToNext(pending.q, answer, {});
      }
    } catch {
      removeThinking();
      setPendingMain(null);
      await advanceToNext(pending.q, answer, {});
    }
  }

  // ── Pokračovat po follow-up ─────────────────────────────────────────────────

  async function handleFollowUpContinue() {
    if (!pendingMain) return;

    // Přečti odpovědi ze state (closure je aktuální v okamžiku kliknutí)
    let fuAnswers: Record<number, string> = {};
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "ai" && m.kind === "followup" && !m.submitted) {
        fuAnswers = m.answers;
        break;
      }
    }

    // Označ followup jako odeslaný
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "ai" && m.kind === "followup" && !m.submitted ? { ...m, submitted: true } : m
      )
    );

    const { q, answer } = pendingMain;
    setPendingMain(null);
    await advanceToNext(q, answer, fuAnswers);
  }

  // ── Posun na další otázku ───────────────────────────────────────────────────

  async function advanceToNext(q: GuideQ, mainAnswer: string, fuAnswers: Record<number, string>) {
    const fuLines = Object.entries(fuAnswers)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `(Doplněk ${Number(k) + 1}: ${v.trim()})`)
      .join(" ");

    const combined = fuLines ? `${mainAnswer} ${fuLines}` : mainAnswer;
    const next: Answer[] = [...answers, { questionId: q.id, question: q.text, answer: combined }];
    setAnswers(next);
    await fetchNextQuestion(next);
  }

  // ── Render zprávy ───────────────────────────────────────────────────────────

  function renderMsg(msg: ChatMsg) {
    if (msg.role === "user") {
      return (
        <div key={msg.id} className="flex justify-end">
          <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
            {msg.text}
          </div>
        </div>
      );
    }

    if (msg.kind === "thinking") {
      return (
        <div key={msg.id} className="flex items-start gap-3">
          <AiAvatar />
          <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="inline-block h-2 w-2 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
              <span className="text-xs text-slate-500">{msg.text}</span>
            </div>
          </div>
        </div>
      );
    }

    if (msg.kind === "question") {
      return (
        <div key={msg.id} className="flex items-start gap-3">
          <AiAvatar />
          <div className="max-w-[78%] space-y-1 rounded-2xl rounded-tl-sm border border-brand-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              🟨 {msg.q.text}
            </p>
            <p className="text-sm text-slate-500">{msg.q.hint}</p>
          </div>
        </div>
      );
    }

    if (msg.kind === "followup") {
      return (
        <div key={msg.id} className="flex items-start gap-3">
          <AiAvatar />
          <div className="flex-1 space-y-3 rounded-2xl rounded-tl-sm border border-brand-200 bg-brand-50 p-4 shadow-sm">
            <p className="text-sm font-semibold text-brand-800">
              💬 Doplňující otázky{" "}
              <span className="font-normal text-brand-600">(volitelné – prohloubí výstup)</span>
            </p>

            {msg.questions.map((q, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-sm text-slate-700">
                  <span className="mr-2 inline-block rounded bg-brand-100 px-1.5 py-0.5 text-xs font-bold text-brand-700">
                    {i + 1}
                  </span>
                  {q}
                </p>
                {msg.submitted ? (
                  msg.answers[i] ? (
                    <p className="pl-7 text-sm text-slate-500">{msg.answers[i]}</p>
                  ) : null
                ) : (
                  <textarea
                    rows={2}
                    value={msg.answers[i] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === msg.id && m.role === "ai" && m.kind === "followup"
                            ? { ...m, answers: { ...m.answers, [i]: val } }
                            : m
                        )
                      );
                    }}
                    className="ml-7 w-[calc(100%-1.75rem)] rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                    placeholder="Volitelná odpověď..."
                  />
                )}
              </div>
            ))}

            {msg.submitted ? (
              <p className="text-xs text-brand-600">✓ Odpovědi uloženy</p>
            ) : (
              <button
                onClick={handleFollowUpContinue}
                className="mt-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Přejít na další otázku →
              </button>
            )}
          </div>
        </div>
      );
    }

    if (msg.kind === "output") {
      return (
        <div key={msg.id} className="flex items-start gap-3">
          <AiAvatar />
          <div className="flex-1 min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">
              ✅ PM výstup vygenerován
            </p>
            <AiOutput content={msg.content} />
          </div>
        </div>
      );
    }

    if (msg.kind === "error") {
      return (
        <div key={msg.id} className="flex items-start gap-3">
          <AiAvatar />
          <div className="rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {msg.text}
          </div>
        </div>
      );
    }

    return null;
  }

  // ── Vstupní area ────────────────────────────────────────────────────────────

  const canSend = status === "awaiting_answer" && inputValue.trim().length > 0;

  function renderInput() {
    if (status === "done") {
      return (
        <p className="py-3 text-center text-sm text-slate-500">
          ✅ Průvodce dokončen. Klikni &ldquo;Spustit znovu&rdquo; výše.
        </p>
      );
    }
    if (status === "awaiting_fu") {
      return (
        <p className="py-3 text-center text-sm text-slate-400">
          Odpověz na doplňující otázky výše a klikni &ldquo;Přejít na další →&rdquo;
        </p>
      );
    }
    if (status === "loading_q" || status === "loading_fu") {
      return <p className="py-3 text-center text-sm text-slate-400">AI přemýšlí...</p>;
    }

    return (
      <div className="flex items-end gap-3">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={3}
          disabled={status !== "awaiting_answer"}
          placeholder="Tvoje odpověď… (Enter = odeslat, Shift+Enter = nový řádek)"
          className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-brand-600 focus:outline-none disabled:opacity-40"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"
          title="Odeslat (Enter)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
          </svg>
        </button>
      </div>
    );
  }

  // ── Render stránky ──────────────────────────────────────────────────────────

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 py-10" style={{ height: "100dvh" }}>
      {/* Nadpis */}
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Průvodce PM otázkami</h1>
        <p className="mt-1 text-sm text-slate-500">
          Konverzační průvodce – AI klade otázky, nabídne 3 doplňující a na konci vygeneruje PM dokumentaci.
        </p>
      </div>

      {/* Konfigurace – před startem nebo po dokončení */}
      {!started || status === "done" ? (
        <div className="mb-4 shrink-0 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
                {projects.length === 0 ? (
                  <option value="">– žádné projekty –</option>
                ) : (
                  projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)
                )}
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
            {status === "done" ? "🔄 Spustit znovu" : "💬 Spustit průvodce"}
          </button>
        </div>
      ) : null}

      {/* Chat plocha */}
      {started ? (
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Zprávy */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((msg) => renderMsg(msg))}
            <div ref={bottomRef} />
          </div>

          {/* Vstupní area – přilepená ke dnu */}
          <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4">
            {renderInput()}
          </div>
        </div>
      ) : null}
    </main>
  );
}

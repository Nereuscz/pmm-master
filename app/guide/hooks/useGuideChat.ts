"use client";

import { useEffect, useRef, useState } from "react";
import type { Project, Answer, GuideQ, ChatMsg, Status, GuideDraft } from "../types";

let _id = 0;
function uid() { return `m${++_id}`; }

export function useGuideChat(projectIdParam: string | null) {
  // Config state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [phase, setPhase] = useState("Iniciace");
  const [framework, setFramework] = useState<"Univerzální" | "Produktový">("Univerzální");
  const [started, setStarted] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQ, setCurrentQ] = useState<GuideQ | null>(null);
  const [pendingMain, setPendingMain] = useState<{ q: GuideQ; answer: string } | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Draft state
  const [pendingDraft, setPendingDraft] = useState<GuideDraft | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoStartedRef = useRef(false);

  // ── Projekty ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((json) => {
        const list: Project[] = json.projects ?? [];
        setProjects(list);
        const preselect = list.find((p) => p.id === projectIdParam) ?? list[0] ?? null;
        if (preselect) {
          setSelectedProject(preselect);
          setPhase(preselect.phase);
          setFramework(preselect.framework as "Univerzální" | "Produktový");
        }
      })
      .catch(() => undefined);
  }, [projectIdParam]);

  // ── Auto-start při příchodu z projektu ────────────────────────────────────

  const startFreshRef = useRef<() => void>(() => {});
  startFreshRef.current = startFresh;

  useEffect(() => {
    if (
      projectIdParam &&
      selectedProject?.id === projectIdParam &&
      !started &&
      !autoStartedRef.current
    ) {
      autoStartedRef.current = true;
      startFreshRef.current();
    }
  }, [projectIdParam, selectedProject?.id, started]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function push(msg: ChatMsg) {
    setMessages((prev) => [...prev, msg]);
  }

  function removeThinking() {
    setMessages((prev) => prev.filter((m) => !(m.role === "ai" && m.kind === "thinking")));
  }

  // ── Draft ─────────────────────────────────────────────────────────────────

  function saveDraft(currentAnswers: Answer[], currentMessages: ChatMsg[]) {
    if (!selectedProject) return;
    fetch("/api/guide/draft", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProject.id,
        phase,
        framework,
        answers: currentAnswers,
        messages: currentMessages
      })
    }).catch(() => undefined);
  }

  function deleteDraft() {
    if (!selectedProject) return;
    fetch("/api/guide/draft", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: selectedProject.id, phase, framework })
    }).catch(() => undefined);
  }

  // ── Načtení další otázky nebo finálního výstupu ───────────────────────────

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
      if (json.totalCount != null) setTotalCount(json.totalCount);

      if (json.done) {
        push({
          id: uid(),
          role: "ai",
          kind: "output",
          content: json.output,
          sessionId: json.sessionId,
          projectId: json.projectId ?? selectedProject?.id,
          saved: json.saved !== false
        });
        deleteDraft();
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
      push({
        id: uid(),
        role: "ai",
        kind: "error",
        text: e instanceof Error ? e.message : "Neznámá chyba"
      });
      setStatus("awaiting_answer");
    }
  }

  // ── Start / Resume ────────────────────────────────────────────────────────

  async function handleStart() {
    if (!selectedProject) return;

    try {
      const r = await fetch(
        `/api/guide/draft?projectId=${selectedProject.id}&phase=${encodeURIComponent(phase)}&framework=${encodeURIComponent(framework)}`
      );
      const json = await r.json();
      if (json.draft && (json.draft.answers as Answer[]).length > 0) {
        setPendingDraft(json.draft as GuideDraft);
        return;
      }
    } catch {
      // Silently ignore – proceed with fresh start
    }

    startFresh();
  }

  function startFresh() {
    if (!selectedProject) return;
    setPendingDraft(null);
    setStarted(true);
    setMessages([]);
    setAnswers([]);
    setCurrentQ(null);
    setPendingMain(null);
    setInputValue("");
    setTotalCount(null);
    setStatus("idle");
    fetchNextQuestion([]);
  }

  function resumeDraft(draft: GuideDraft) {
    if (!selectedProject) return;
    setPendingDraft(null);
    setStarted(true);
    setMessages(draft.messages);
    setAnswers(draft.answers);
    setCurrentQ(null);
    setPendingMain(null);
    setInputValue("");
    setTotalCount(null);
    setStatus("idle");
    fetchNextQuestion(draft.answers);
  }

  // ── Odeslání odpovědi ─────────────────────────────────────────────────────

  async function handleSend() {
    if (!inputValue.trim() || !currentQ || status !== "awaiting_answer") return;

    const answer = inputValue.trim();
    setInputValue("");
    push({ id: uid(), role: "user", text: answer });

    // 1. Zkontroluj, zda uživatel nežádá o vysvětlení otázky
    setStatus("loading_clarify");
    push({ id: uid(), role: "ai", kind: "thinking", text: "Rozumím otázce..." });

    try {
      const clarifyRes = await fetch("/api/guide/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionName: currentQ.text,
          questionHint: currentQ.hint,
          userText: answer,
          framework,
          phase
        })
      });
      const clarifyJson = await clarifyRes.json();
      removeThinking();

      if (clarifyJson.isClarification && clarifyJson.explanation) {
        push({ id: uid(), role: "ai", kind: "clarification", text: clarifyJson.explanation });
        setStatus("awaiting_answer");
        setTimeout(() => inputRef.current?.focus(), 80);
        return;
      }
    } catch {
      removeThinking();
    }

    // 2. Skutečná odpověď → fetch follow-up
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

  // ── Follow-up continue ────────────────────────────────────────────────────

  async function handleFollowUpContinue() {
    if (!pendingMain) return;

    let fuAnswers: Record<number, string> = {};
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "ai" && m.kind === "followup" && !m.submitted) {
        fuAnswers = m.answers;
        break;
      }
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.role === "ai" && m.kind === "followup" && !m.submitted ? { ...m, submitted: true } : m
      )
    );

    const { q, answer } = pendingMain;
    setPendingMain(null);
    await advanceToNext(q, answer, fuAnswers);
  }

  async function advanceToNext(q: GuideQ, mainAnswer: string, fuAnswers: Record<number, string>) {
    const fuLines = Object.entries(fuAnswers)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `(Doplněk ${Number(k) + 1}: ${v.trim()})`)
      .join(" ");

    const combined = fuLines ? `${mainAnswer} ${fuLines}` : mainAnswer;
    const next: Answer[] = [...answers, { questionId: q.id, question: q.text, answer: combined }];
    setAnswers(next);
    setMessages((current) => {
      saveDraft(next, current);
      return current;
    });
    await fetchNextQuestion(next);
  }

  // ── Follow-up answer update ───────────────────────────────────────────────

  function updateFollowUpAnswer(msgId: string, idx: number, value: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.role === "ai" && m.kind === "followup"
          ? { ...m, answers: { ...m.answers, [idx]: value } }
          : m
      )
    );
  }

  return {
    projects,
    selectedProject,
    setSelectedProject,
    phase,
    setPhase,
    framework,
    setFramework,
    started,
    messages,
    answers,
    inputValue,
    setInputValue,
    status,
    totalCount,
    currentQ,
    pendingDraft,
    setPendingDraft,
    bottomRef,
    inputRef,
    handleStart,
    startFresh,
    resumeDraft,
    handleSend,
    handleFollowUpContinue,
    updateFollowUpAnswer,
    deleteDraft
  };
}

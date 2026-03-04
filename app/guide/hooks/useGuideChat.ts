"use client";

import { useEffect, useRef, useState } from "react";
import type { Project, Answer, GuideQ, ChatMsg, Status, GuideDraft, ChatMode, CanvasQuestion } from "../types";

let _id = 0;
function uid() { return `m${++_id}`; }

export function useGuideChat(projectIdParam: string | null, modeParam: string | null) {
  // Config state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [phase, setPhase] = useState("Iniciace");
  const [framework, setFramework] = useState<"Univerzální" | "Produktový">("Univerzální");

  // Chatbot mode
  const [chatMode, setChatMode] = useState<ChatMode>("idle");
  const [started, setStarted] = useState(false);

  // Chat state – počáteční uvítací zpráva
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: "m0", role: "ai", kind: "greeting" }
  ]);
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

  // ── Auto-start z URL ?mode= ────────────────────────────────────────────────

  const startFreshRef = useRef<() => void>(() => {});
  startFreshRef.current = startFresh;

  const generateCanvasRef = useRef<(p: string, fw: string) => Promise<void>>(async () => {});
  // Updated after each render

  useEffect(() => {
    if (!selectedProject || autoStartedRef.current || !modeParam) return;
    if (modeParam === "guide" && selectedProject.id === (projectIdParam ?? selectedProject.id)) {
      autoStartedRef.current = true;
      // Check for existing draft first
      fetch(
        `/api/guide/draft?projectId=${selectedProject.id}&phase=${encodeURIComponent(phase)}&framework=${encodeURIComponent(framework)}`
      )
        .then((r) => r.json())
        .then((json) => {
          if (json.draft && (json.draft.answers as Answer[]).length > 0) {
            setPendingDraft(json.draft as GuideDraft);
          } else {
            startFreshRef.current();
          }
        })
        .catch(() => startFreshRef.current());
    } else if (modeParam === "canvas") {
      autoStartedRef.current = true;
      generateCanvasRef.current(phase, framework);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id, modeParam]);

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
        // Vrátit se do idle – uživatel může pokračovat v chatu
        setChatMode("idle");
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

  // ── Canvas generování ─────────────────────────────────────────────────────

  async function generateCanvas(resolvedPhase: string, resolvedFramework: string) {
    setChatMode("canvas");
    setStatus("loading_q");
    push({ id: uid(), role: "ai", kind: "thinking", text: "Generuji sadu otázek…" });

    try {
      const r = await fetch("/api/guide/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: resolvedPhase,
          framework: resolvedFramework,
          projectId: selectedProject?.id
        })
      });
      const json = await r.json();
      removeThinking();

      if (!r.ok) throw new Error(json.error || "Chyba generování");

      const questions: CanvasQuestion[] = json.questions ?? [];
      push({
        id: uid(),
        role: "ai",
        kind: "canvas",
        questions,
        phase: (json.phase as string) || resolvedPhase,
        framework: (json.framework as string) || resolvedFramework
      });
      setStatus("idle");
      setChatMode("idle"); // Vrátit do idle – uživatel může pokračovat
    } catch (e) {
      removeThinking();
      push({
        id: uid(),
        role: "ai",
        kind: "error",
        text: e instanceof Error ? e.message : "Nepodařilo se vygenerovat canvas"
      });
      setStatus("idle");
      setChatMode("idle");
    }
  }
  // Aktualizuj ref na každém renderu
  generateCanvasRef.current = generateCanvas;

  // ── Routing první zprávy ──────────────────────────────────────────────────

  async function handleInitialMessage(text: string) {
    push({ id: uid(), role: "user", text });
    setChatMode("routing");
    setStatus("loading_q");
    push({ id: uid(), role: "ai", kind: "thinking", text: "Rozumím požadavku…" });

    try {
      const r = await fetch("/api/guide/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          phase,
          framework,
          projectName: selectedProject?.name
        })
      });
      const json = await r.json();
      removeThinking();

      const intent = (json.intent as string) ?? "guide";
      const phaseOverride = json.phaseOverride as string | null;
      const frameworkOverride = json.frameworkOverride as string | null;

      if (intent === "canvas") {
        const resolvedPhase = phaseOverride || phase;
        const resolvedFw = (frameworkOverride as "Univerzální" | "Produktový") || framework;
        if (phaseOverride) setPhase(phaseOverride);
        if (frameworkOverride) setFramework(resolvedFw);
        await generateCanvas(resolvedPhase, resolvedFw);
        return;
      }

      if (intent === "general") {
        push({
          id: uid(),
          role: "ai",
          kind: "clarification",
          text: (json.response as string) || "Mohu tě provést PM průvodcem nebo připravit sadu otázek na schůzku."
        });
        setStatus("idle");
        setChatMode("idle");
        return;
      }

      // intent === "guide"
      if (!selectedProject) {
        push({
          id: uid(),
          role: "ai",
          kind: "clarification",
          text: "Průvodce potřebuje vybraný projekt. Vyber projekt v liště nahoře a zkus to znovu."
        });
        setStatus("idle");
        setChatMode("idle");
        return;
      }

      // Check for existing draft
      try {
        const draftR = await fetch(
          `/api/guide/draft?projectId=${selectedProject.id}&phase=${encodeURIComponent(phase)}&framework=${encodeURIComponent(framework)}`
        );
        const draftJson = await draftR.json();
        if (draftJson.draft && (draftJson.draft.answers as Answer[]).length > 0) {
          setPendingDraft(draftJson.draft as GuideDraft);
          setStatus("idle");
          // chatMode zůstane "routing" → ResumeModal se zobrazí
          // Po resume/start fresh se nastaví "guide"
          return;
        }
      } catch {
        // Ignore draft check errors
      }

      startFresh();
    } catch {
      removeThinking();
      push({
        id: uid(),
        role: "ai",
        kind: "error",
        text: "Nepodařilo se zpracovat požadavek. Zkus to znovu."
      });
      setStatus("idle");
      setChatMode("idle");
    }
  }

  // ── Start / Resume ────────────────────────────────────────────────────────

  function startFresh() {
    if (!selectedProject) return;
    setPendingDraft(null);
    setChatMode("guide");
    setStarted(true);
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
    setChatMode("guide");
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
    const text = inputValue.trim();
    if (!text) return;

    // Idle nebo po výstupu → routing nové zprávy
    if (chatMode === "idle") {
      setInputValue("");
      await handleInitialMessage(text);
      return;
    }

    // Guide – normální flow
    if (chatMode !== "guide" || status !== "awaiting_answer" || !currentQ) return;

    const answer = text;
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
      const updated = [...current];
      let lastUserIdx = -1;
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === "user") {
          lastUserIdx = i;
          break;
        }
      }
      if (lastUserIdx >= 0 && updated[lastUserIdx].role === "user") {
        updated[lastUserIdx] = { ...updated[lastUserIdx], answerToQuestionId: q.id };
      }
      saveDraft(next, updated);
      return updated;
    });
    await fetchNextQuestion(next);
  }

  // ── Aktualizace odpovědi z canvasu (editace / AI doplnění) ─────────────────

  function updateCanvasAnswer(questionId: string, newAnswer: string) {
    setAnswers((prev) => {
      const idx = prev.findIndex((a) => a.questionId === questionId);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], answer: newAnswer };
      saveDraft(next, messages);
      return next;
    });
  }

  // ── Editace odpovědi z chatu ──────────────────────────────────────────────

  function editAnswerFromChat(questionId: string, msgId: string, newMainAnswer: string) {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msgId);
      if (idx < 0) return prev;
      const nextMsg = prev[idx + 1];
      let combined = newMainAnswer;
      if (nextMsg?.role === "ai" && nextMsg.kind === "followup" && nextMsg.submitted) {
        const fuLines = Object.entries(nextMsg.answers)
          .filter(([, v]) => v?.trim())
          .map(([k, v]) => `(Doplněk ${Number(k) + 1}: ${String(v).trim()})`)
          .join(" ");
        if (fuLines) combined = `${newMainAnswer} ${fuLines}`;
      }
      setAnswers((a) => {
        const ai = a.findIndex((x) => x.questionId === questionId);
        if (ai < 0) return a;
        const next = [...a];
        next[ai] = { ...next[ai], answer: combined };
        saveDraft(next, prev.map((m) => (m.id === msgId && m.role === "user" ? { ...m, text: newMainAnswer } : m)));
        return next;
      });
      return prev.map((m) =>
        m.id === msgId && m.role === "user" ? { ...m, text: newMainAnswer } : m
      );
    });
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
    chatMode,
    setChatMode,
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
    startFresh,
    resumeDraft,
    handleSend,
    handleFollowUpContinue,
    updateFollowUpAnswer,
    updateCanvasAnswer,
    editAnswerFromChat,
    deleteDraft,
    generateCanvas
  };
}

"use client";

import { useMemo, Suspense, useState, useEffect } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getQuestionsForPhase } from "@/lib/guide";
import { useGuideChat } from "./hooks/useGuideChat";
import { useTTS } from "./hooks/useTTS";
import { ResumeModal } from "./components/ResumeModal";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { LiveCanvas } from "./components/LiveCanvas";
import { UploadedContextBar } from "./components/UploadedContextBar";

const PHASES = ["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"];

function GuideChat() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const modeParam = searchParams.get("mode"); // "guide" | "canvas" | null

  const {
    projects,
    selectedProject,
    setSelectedProject,
    phase,
    setPhase,
    framework,
    setFramework,
    chatMode,
    started,
    messages,
    answers,
    inputValue,
    setInputValue,
    status,
    totalCount,
    pendingDraft,
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
    uploadedContext,
    clearUploadedContext,
    uploadFile,
    prefillFromUploadedContext,
    voiceMode,
    setVoiceMode
  } = useGuideChat(projectIdParam, modeParam);

  const showProgressBar = chatMode === "guide" && started && totalCount != null;
  const showLiveCanvas = started && chatMode === "guide";
  const [chatOpen, setChatOpen] = useState(true);

  const { speakText } = useTTS(voiceMode);

  // TTS: když přijde nová otázka, clarification nebo follow-up, přečti ji nahlas
  useEffect(() => {
    if (!voiceMode || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== "ai") return;
    if (last.kind === "question") {
      speakText(`${last.q.text}. ${last.q.hint}`);
    } else if (last.kind === "clarification") {
      speakText(last.text);
    } else if (last.kind === "followup") {
      const intro = "Doplňující otázky. ";
      const qs = last.questions.map((q, i) => `${i + 1}. ${q}`).join(" ");
      speakText(intro + qs);
    }
  }, [messages, voiceMode, speakText]);

  // Canvas data – odvozeno z answers a otázek pro aktuální fázi
  const canvasSections = useMemo(
    () => Object.fromEntries(answers.map((a) => [a.questionId, a.answer])),
    [answers]
  );
  const canvasQuestions = useMemo(
    () => getQuestionsForPhase(phase, framework),
    [phase, framework]
  );

  // Follow-up stav pro progress bar
  const fuInfo = (() => {
    if (status !== "awaiting_fu") return null;
    const lastFu = [...messages]
      .reverse()
      .find((m) => m.role === "ai" && m.kind === "followup" && !m.submitted);
    const fuFilled =
      lastFu && "answers" in lastFu
        ? Object.values(lastFu.answers).filter((v) => v?.trim()).length
        : 0;
    return ` · doplňující: ${fuFilled}/3`;
  })();

  return (
    <main
      className={`mx-auto flex flex-col ${showLiveCanvas ? "max-w-full px-4 py-6 lg:px-6" : "max-w-3xl px-6 py-10"}`}
      style={{ height: "100dvh" }}
    >
      {/* Nadpis – jen když chat není spuštěn */}
      {!started && (
        <div className="mb-3 shrink-0">
          <Breadcrumbs items={[{ label: "Projekty", href: "/dashboard" }, { label: "Průvodce" }]} />
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
            Průvodce PM
          </h1>
          <p className="mt-1 text-[15px] text-[#6e6e73]">
            Interaktivní PM asistent – průvodce rozhovorem nebo příprava na schůzku.
          </p>
        </div>
      )}

      {/* Lišta kontextu – config nebo progress bar */}
      <div className="mb-3 shrink-0 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-apple">
        {showProgressBar ? (
          // Progress bar v průběhu průvodce
          <>
            {selectedProject && (
              <>
                <span className="max-w-[160px] truncate text-[13px] font-semibold text-[#1d1d1f]">
                  {selectedProject.name}
                </span>
                <span className="text-[#d2d2d7]">·</span>
              </>
            )}
            <span className="shrink-0 text-[12px] text-[#6e6e73]">{phase}</span>
            <span className="text-[#d2d2d7]">·</span>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="h-1.5 min-w-[60px] flex-1 overflow-hidden rounded-full bg-[#f2f2f7]">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, (answers.length / totalCount!) * 100)}%` }}
                />
              </div>
              <span className="shrink-0 tabular-nums text-[12px] font-medium text-[#6e6e73]">
                {answers.length}/{totalCount} otázek{fuInfo}
              </span>
            </div>
          </>
        ) : (
          // Config selektory
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <select
              value={selectedProject?.id ?? ""}
              onChange={(e) => {
                const p = projects.find((p) => p.id === e.target.value) ?? null;
                setSelectedProject(p);
                if (p) {
                  setPhase(p.phase ?? "Iniciace");
                  setFramework(p.framework as "Univerzální" | "Produktový");
                }
              }}
              className="rounded-lg border border-[#d2d2d7] bg-[#fafafa] px-3 py-1.5 text-[13px] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600/20"
            >
              <option value="">– projekt –</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <span className="text-[#d2d2d7]">·</span>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="rounded-lg border border-[#d2d2d7] bg-[#fafafa] px-3 py-1.5 text-[13px] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600/20"
            >
              {PHASES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <span className="text-[#d2d2d7]">·</span>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value as "Univerzální" | "Produktový")}
              className="rounded-lg border border-[#d2d2d7] bg-[#fafafa] px-3 py-1.5 text-[13px] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600/20"
            >
              <option>Univerzální</option>
              <option>Produktový</option>
            </select>
          </div>
        )}
      </div>

      {/* Resume modal */}
      {pendingDraft ? (
        <ResumeModal
          draft={pendingDraft}
          onResume={() => resumeDraft(pendingDraft)}
          onStartFresh={() => {
            deleteDraft();
            startFresh();
          }}
        />
      ) : null}

      {/* Integrovaný layout: canvas hlavní, chat jako skládací sidebar */}
      {showLiveCanvas ? (
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* Chat sidebar – skládací panel vlevo */}
          <aside
            className={`flex shrink-0 flex-col border-r border-[#e8e8ed] bg-white shadow-apple transition-all duration-300 ease-out ${
              chatOpen ? "w-[340px] lg:w-[380px]" : "w-0 overflow-hidden"
            }`}
          >
            <div className="flex h-full min-w-[340px] flex-col lg:min-w-[380px]">
              <div className="flex shrink-0 flex-col gap-2 border-b border-[#f2f2f7] px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[#1d1d1f]">Chat</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setVoiceMode((v) => !v)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                        voiceMode
                          ? "bg-brand-100 text-brand-700"
                          : "text-[#6e6e73] hover:bg-[#f2f2f7] hover:text-[#1d1d1f]"
                      }`}
                      title={voiceMode ? "Vypnout hlasový režim" : "Zapnout hlasový režim"}
                      aria-label={voiceMode ? "Vypnout hlasový režim" : "Zapnout hlasový režim"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                        <path fillRule="evenodd" d="M5 9.643a.75.75 0 01-1.5 0V4.643a.75.75 0 011.5 0v5z" clipRule="evenodd" />
                        <path d="M3 8.643a.75.75 0 00-1.5 0v1a6 6 0 1012 0v-1a.75.75 0 00-1.5 0v1a4.5 4.5 0 01-9 0v-1z" />
                      </svg>
                      {voiceMode ? "Hlas" : "Text"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatOpen(false)}
                      className="rounded-lg p-1.5 text-[#6e6e73] hover:bg-[#f2f2f7] hover:text-[#1d1d1f]"
                      aria-label="Skrýt chat"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
                {uploadedContext.trim().length > 0 && (
                  <UploadedContextBar
                    charCount={uploadedContext.length}
                    onPrefill={prefillFromUploadedContext}
                    onClear={clearUploadedContext}
                    isPrefilling={status === "loading_q"}
                    disabled={status === "loading_q" || status === "loading_fu" || status === "loading_clarify"}
                  />
                )}
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    msg={msg}
                    selectedProject={selectedProject}
                    onFollowUpAnswerChange={updateFollowUpAnswer}
                    onFollowUpContinue={handleFollowUpContinue}
                    onStartGuide={startFresh}
                    onEditAnswer={editAnswerFromChat}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="shrink-0 border-t border-[#f2f2f7] bg-[#fafafa] px-4 py-3">
                <ChatInput
                  inputRef={inputRef}
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  onSend={handleSend}
                  status={status}
                  chatMode={chatMode}
                  voiceMode={voiceMode}
                  onAttachment={async (file) => {
                    const ok = await uploadFile(file);
                    if (ok) toast.success("Příloha přidána – použije se jako kontext pro AI.");
                  }}
                />
              </div>
            </div>
          </aside>

          {/* Hlavní obsah – canvas */}
          <div className="relative flex min-w-0 flex-1 flex-col">
            {/* Tlačítko pro otevření chatu, když je zavřený */}
            {!chatOpen && (
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-[#e8e8ed] bg-white px-4 py-2.5 text-[13px] font-medium text-[#1d1d1f] shadow-apple transition-shadow hover:shadow-apple-lg"
                aria-label="Otevřít chat"
              >
                <span>💬</span>
                Chat
              </button>
            )}
            <LiveCanvas
              sections={canvasSections}
              questions={canvasQuestions}
              phase={phase}
              framework={framework}
              projectName={selectedProject?.name}
              projectId={selectedProject?.id}
              uploadedContext={uploadedContext}
              onSectionChange={updateCanvasAnswer}
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col rounded-apple bg-white shadow-apple">
          {uploadedContext.trim().length > 0 && (
            <div className="shrink-0 border-b border-[#f2f2f7] px-5 py-2">
              <UploadedContextBar
                charCount={uploadedContext.length}
                onPrefill={prefillFromUploadedContext}
                onClear={clearUploadedContext}
                isPrefilling={status === "loading_q"}
                disabled={status === "loading_q" || status === "loading_fu" || status === "loading_clarify"}
              />
            </div>
          )}
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                selectedProject={selectedProject}
                onFollowUpAnswerChange={updateFollowUpAnswer}
                onFollowUpContinue={handleFollowUpContinue}
                onStartGuide={startFresh}
                onEditAnswer={editAnswerFromChat}
              />
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="shrink-0 border-t border-[#f2f2f7] bg-[#fafafa] px-5 py-4">
            <ChatInput
              inputRef={inputRef}
              inputValue={inputValue}
              setInputValue={setInputValue}
              onSend={handleSend}
              status={status}
              chatMode={chatMode}
              voiceMode={false}
              onAttachment={async (file) => {
                const ok = await uploadFile(file);
                if (ok) toast.success("Příloha přidána – použije se jako kontext pro AI.");
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default function GuidePage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-slate-500">Načítám průvodce...</p>}>
      <GuideChat />
    </Suspense>
  );
}

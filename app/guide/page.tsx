"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useGuideChat } from "./hooks/useGuideChat";
import { GuideConfig } from "./components/GuideConfig";
import { ResumeModal } from "./components/ResumeModal";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";

function ModeSelection({ onSelectGuide }: { onSelectGuide: () => void }) {
  return (
    <div className="mb-4 shrink-0">
      <p className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
        Jak chceš pracovat?
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={onSelectGuide}
          className="group flex flex-col items-start rounded-apple bg-white p-6 shadow-apple transition-all hover:-translate-y-0.5 hover:shadow-apple-lg text-left"
        >
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-xl">💬</span>
          <span className="text-[16px] font-semibold text-[#1d1d1f] group-hover:text-brand-600">Průvodce</span>
          <span className="mt-1.5 text-[13px] leading-relaxed text-[#6e6e73]">
            AI klade otázky jednu po druhé, reaguje na tvoje odpovědi a na konci vygeneruje PM dokumentaci.
          </span>
          <span className="mt-4 text-[13px] font-medium text-brand-600">Spustit →</span>
        </button>

        <Link
          href="/guide/canvas"
          className="group flex flex-col items-start rounded-apple bg-white p-6 shadow-apple transition-all hover:-translate-y-0.5 hover:shadow-apple-lg"
        >
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-xl">📋</span>
          <span className="text-[16px] font-semibold text-[#1d1d1f] group-hover:text-brand-600">Příprava na schůzku</span>
          <span className="mt-1.5 text-[13px] leading-relaxed text-[#6e6e73]">
            Celá sada PM otázek s doplňujícími najednou – vytiskni si je nebo si je projdi před živým rozhovorem.
          </span>
          <span className="mt-4 text-[13px] font-medium text-brand-600">Otevřít →</span>
        </Link>
      </div>
    </div>
  );
}

function GuideChat() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const [mode, setMode] = useState<"select" | "guide">(projectIdParam ? "guide" : "select");

  const {
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
    pendingDraft,
    bottomRef,
    inputRef,
    handleStart,
    startFresh,
    resumeDraft,
    handleSend,
    handleFollowUpContinue,
    updateFollowUpAnswer,
    deleteDraft
  } = useGuideChat(projectIdParam);

  const showConfig = (!started && !projectIdParam) || status === "done";

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 py-10" style={{ height: "100dvh" }}>
      {/* Nadpis */}
      <div className="mb-4 shrink-0">
        <Breadcrumbs items={[{ label: "Projekty", href: "/dashboard" }, { label: "Průvodce" }]} />
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
          Průvodce PM otázkami
        </h1>
        <p className="mt-1 text-[15px] text-[#6e6e73]">
          Interaktivní průvodce PM dokumentací nebo příprava otázek na schůzku.
        </p>
        {started && totalCount != null ? (
          <p className="mt-2 text-[13px] font-medium text-[#6e6e73]">
            {answers.length} z {totalCount} otázek
            {status === "awaiting_fu"
              ? (() => {
                  const lastFu = [...messages]
                    .reverse()
                    .find((m) => m.role === "ai" && m.kind === "followup" && !m.submitted);
                  const fuFilled =
                    lastFu && "answers" in lastFu
                      ? Object.values(lastFu.answers).filter((v) => v?.trim()).length
                      : 0;
                  return ` · doplňující: ${fuFilled}/3`;
                })()
              : null}
          </p>
        ) : null}
      </div>

      {/* Výběr režimu nebo konfigurace */}
      {mode === "select" && !started ? (
        <ModeSelection onSelectGuide={() => setMode("guide")} />
      ) : showConfig ? (
        <GuideConfig
          projects={projects}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          phase={phase}
          setPhase={setPhase}
          framework={framework}
          setFramework={setFramework}
          onStart={status === "done" ? startFresh : handleStart}
          isDone={status === "done"}
        />
      ) : null}

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

      {/* Loading placeholder při auto-startu z projektu */}
      {!started && projectIdParam ? (
        <div className="mb-4 shrink-0 rounded-apple bg-white p-5 shadow-apple">
          <div className="flex items-center gap-3 text-[14px] text-[#6e6e73]">
            <span className="flex gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="inline-block h-2 w-2 animate-bounce rounded-full bg-[#d2d2d7]"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
            Spouštím průvodce…
          </div>
        </div>
      ) : null}

      {/* Chat plocha */}
      {started ? (
        <div className="flex min-h-0 flex-1 flex-col rounded-apple bg-white shadow-apple">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                selectedProject={selectedProject}
                onFollowUpAnswerChange={updateFollowUpAnswer}
                onFollowUpContinue={handleFollowUpContinue}
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
            />
          </div>
        </div>
      ) : null}
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

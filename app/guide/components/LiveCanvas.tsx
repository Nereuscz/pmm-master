"use client";

import { useState, useCallback, useRef } from "react";
import type { GuideQ } from "../types";

type Props = {
  sections: Record<string, string>;
  questions: GuideQ[];
  phase: string;
  framework: string;
  projectName?: string;
  projectId?: string;
  uploadedContext?: string;
  onSectionChange: (questionId: string, newContent: string) => void;
};

type SelectionState = {
  questionId: string;
  start: number;
  end: number;
  text: string;
};

export function LiveCanvas({
  sections,
  questions,
  phase,
  framework,
  projectName,
  projectId,
  uploadedContext,
  onSectionChange
}: Props) {
  const [elaboratingId, setElaboratingId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<Record<string, string>>({});
  const [showPromptFor, setShowPromptFor] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const clearSelection = useCallback(() => {
    setSelection(null);
    setShowPromptFor(null);
    window.getSelection?.()?.removeAllRanges();
  }, []);

  const handleElaborate = useCallback(
    async (q: GuideQ, userPrompt?: string, selected?: SelectionState) => {
      const content = sections[q.id];
      if (!content?.trim()) return;

      const hasSelection = selected && selected.text.trim().length > 0;

      setElaboratingId(q.id);
      try {
        const res = await fetch("/api/guide/canvas/elaborate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: q.id,
            questionName: q.text,
            questionHint: q.hint,
            currentContent: content,
            selectedText: hasSelection ? selected!.text : undefined,
            userPrompt: userPrompt?.trim() || undefined,
            projectId,
            uploadedContext,
            framework,
            phase
          })
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        if (json.content) {
          if (hasSelection) {
            const newContent =
              content.slice(0, selected!.start) + json.content + content.slice(selected!.end);
            onSectionChange(q.id, newContent);
          } else {
            onSectionChange(q.id, json.content);
          }
        }
      } catch (e) {
        console.error("Elaborate error:", e);
      } finally {
        setElaboratingId(null);
        setShowPromptFor(null);
        setSelection(null);
        setCustomPrompt((p) => ({ ...p, [q.id]: "" }));
      }
    },
    [sections, projectId, framework, phase, uploadedContext, onSectionChange]
  );

  const handleSelect = useCallback(
    (q: GuideQ, el: HTMLTextAreaElement) => {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start === end) {
        setSelection(null);
        return;
      }
      const text = el.value.slice(start, end);
      setSelection({ questionId: q.id, start, end, text });
    },
    []
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-apple bg-white shadow-apple">
      {/* Sticky header */}
      <div className="shrink-0 border-b border-[#f2f2f7] px-5 py-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
          PM Canvas
        </h2>
        <p className="mt-0.5 text-[14px] font-medium text-[#1d1d1f]">
          {projectName ? `${projectName} – ` : ""}
          {framework} · {phase}
        </p>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          {questions.map((q) => {
            const content = sections[q.id];
            const isElaborating = elaboratingId === q.id;
            const showPrompt = showPromptFor === q.id;
            const sel = selection?.questionId === q.id ? selection : null;

            return (
              <section
                key={q.id}
                className="rounded-xl border border-[#e8e8ed] bg-[#fafafa] overflow-hidden"
              >
                <div className="border-b border-[#e8e8ed] bg-white px-4 py-2.5">
                  <h3 className="text-[13px] font-semibold text-[#1d1d1f]">🟨 {q.text}</h3>
                  <p className="mt-0.5 text-[12px] text-[#6e6e73]">{q.hint}</p>
                </div>
                <div className="px-4 py-3">
                  {content ? (
                    <div className="space-y-2">
                      <textarea
                        ref={(el) => {
                          textareaRefs.current[q.id] = el;
                        }}
                        value={content}
                        onChange={(e) => onSectionChange(q.id, e.target.value)}
                        onSelect={(e) => handleSelect(q, e.currentTarget)}
                        className="w-full min-h-[80px] resize-y rounded-lg border border-[#e8e8ed] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[#1d1d1f] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600/20"
                        placeholder="Zatím prázdné – odpověz v chatu"
                        disabled={isElaborating}
                      />
                      {/* Toolbar – výběr nebo celá sekce. onMouseDown preventDefault = neztratit výběr při kliknutí */}
                      {(sel || !showPrompt) && (
                        <div
                          className="flex flex-wrap items-center gap-2"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {sel ? (
                            <>
                              <span className="text-[12px] text-[#6e6e73]">
                                Vybráno {sel.text.length} znaků
                              </span>
                              <button
                                type="button"
                                onClick={() => handleElaborate(q, customPrompt[q.id], sel)}
                                disabled={isElaborating}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isElaborating ? (
                                  <>
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Generuji…
                                  </>
                                ) : (
                                  <>
                                    <span aria-hidden>✨</span>
                                    Doplň vybrané
                                  </>
                                )}
                              </button>
                              {showPrompt ? (
                                <>
                                  <input
                                    type="text"
                                    value={customPrompt[q.id] ?? ""}
                                    onChange={(e) =>
                                      setCustomPrompt((p) => ({ ...p, [q.id]: e.target.value }))
                                    }
                                    placeholder="Vlastní prompt"
                                    className="flex-1 min-w-[140px] rounded-lg border border-[#e8e8ed] bg-white px-2.5 py-1.5 text-[12px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleElaborate(q, customPrompt[q.id], sel);
                                      if (e.key === "Escape") clearSelection();
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleElaborate(q, customPrompt[q.id], sel)}
                                    disabled={isElaborating}
                                    className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                                  >
                                    Generovat
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setShowPromptFor(q.id)}
                                  className="text-[12px] text-[#6e6e73] hover:text-brand-600"
                                >
                                  S vlastním promptem
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={clearSelection}
                                className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f]"
                              >
                                Zrušit výběr
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleElaborate(q)}
                                disabled={isElaborating}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isElaborating ? (
                                  <>
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Generuji…
                                  </>
                                ) : (
                                  <>
                                    <span aria-hidden>✨</span>
                                    Doplň celou sekci
                                  </>
                                )}
                              </button>
                              {showPrompt ? (
                                <>
                                  <input
                                    type="text"
                                    value={customPrompt[q.id] ?? ""}
                                    onChange={(e) =>
                                      setCustomPrompt((p) => ({ ...p, [q.id]: e.target.value }))
                                    }
                                    placeholder="Vlastní prompt (např. upřesni finanční část)"
                                    className="flex-1 min-w-[180px] rounded-lg border border-[#e8e8ed] bg-white px-2.5 py-1.5 text-[12px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleElaborate(q, customPrompt[q.id]);
                                      if (e.key === "Escape") setShowPromptFor(null);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleElaborate(q, customPrompt[q.id])}
                                    disabled={isElaborating}
                                    className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                                  >
                                    Generovat
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowPromptFor(null)}
                                    className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f]"
                                  >
                                    Zrušit
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setShowPromptFor(q.id)}
                                  className="text-[12px] text-[#6e6e73] hover:text-brand-600"
                                >
                                  S vlastním promptem
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] text-[#aeaeb2]">
                        Vyber část textu pro úpravu jen vybraného, nebo použij tlačítko pro celou sekci.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[12px] italic text-[#aeaeb2]">
                      Zatím prázdné – odpověz v chatu
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

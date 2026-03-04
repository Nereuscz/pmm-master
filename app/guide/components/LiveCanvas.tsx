"use client";

import type { GuideQ } from "../types";

type Props = {
  sections: Record<string, string>;
  questions: GuideQ[];
  phase: string;
  framework: string;
  projectName?: string;
};

export function LiveCanvas({ sections, questions, phase, framework, projectName }: Props) {
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
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#1d1d1f]">
                      {content}
                    </p>
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

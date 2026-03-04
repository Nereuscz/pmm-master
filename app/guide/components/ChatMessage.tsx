import Link from "next/link";
import AiOutput from "@/components/AiOutput";
import { AiAvatar } from "./AiAvatar";
import type { ChatMsg, Project } from "../types";

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

type Props = {
  msg: ChatMsg;
  selectedProject: Project | null;
  onFollowUpAnswerChange: (msgId: string, idx: number, value: string) => void;
  onFollowUpContinue: () => void;
};

export function ChatMessage({ msg, selectedProject, onFollowUpAnswerChange, onFollowUpContinue }: Props) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-3 text-[14px] leading-relaxed text-white shadow-apple-sm">
          {msg.text}
        </div>
      </div>
    );
  }

  if (msg.kind === "thinking") {
    return (
      <div className="flex items-start gap-3">
        <AiAvatar />
        <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-apple-sm">
          <div className="flex items-center gap-2">
            <span className="flex gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="inline-block h-2 w-2 animate-bounce rounded-full bg-[#d2d2d7]"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
            <span className="text-[12px] text-[#aeaeb2]">{msg.text}</span>
          </div>
        </div>
      </div>
    );
  }

  if (msg.kind === "question") {
    return (
      <div className="flex items-start gap-3">
        <AiAvatar />
        <div className="max-w-[78%] space-y-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3.5 shadow-apple-sm">
          <p className="text-[13px] font-semibold text-[#1d1d1f]">🟨 {msg.q.text}</p>
          <p className="text-[13px] text-[#6e6e73]">{msg.q.hint}</p>
          {msg.q.context && (
            <div className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
              💡 {msg.q.context}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (msg.kind === "clarification") {
    return (
      <div className="flex items-start gap-3">
        <AiAvatar />
        <div className="max-w-[78%] space-y-2 rounded-2xl rounded-tl-sm bg-[#f5f0ff] px-4 py-3.5 shadow-apple-sm">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#7c3aed]">
            💡 Vysvětlení
          </p>
          <p className="text-[14px] leading-relaxed text-[#3b0764]">{msg.text}</p>
          <p className="text-[12px] text-[#7c3aed]">↩ Zkus teď odpovědět znovu.</p>
        </div>
      </div>
    );
  }

  if (msg.kind === "followup") {
    return (
      <div className="flex items-start gap-3">
        <AiAvatar />
        <div className="flex-1 space-y-3 rounded-2xl rounded-tl-sm bg-brand-50 p-4 shadow-apple-sm">
          <p className="text-[13px] font-semibold text-brand-800">
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
                  onChange={(e) => onFollowUpAnswerChange(msg.id, i, e.target.value)}
                  className="ml-7 w-[calc(100%-1.75rem)] resize-none rounded-xl border border-brand-100 bg-white px-3 py-2 text-[13px] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-600/10"
                  placeholder="Volitelná odpověď..."
                />
              )}
            </div>
          ))}

          {msg.submitted ? (
            <p className="text-xs text-brand-600">✓ Odpovědi uloženy</p>
          ) : (
            <button
              onClick={onFollowUpContinue}
              className="mt-1 rounded-full bg-brand-600 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand-700"
            >
              Přejít na další otázku →
            </button>
          )}
        </div>
      </div>
    );
  }

  if (msg.kind === "output") {
    const isSaved = msg.saved !== false;
    return (
      <div className="flex items-start gap-3">
        <AiAvatar />
        <div className="flex-1 min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            {isSaved ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                ✅ PM výstup vygenerován a uložen do projektu
              </span>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                ⚠️ PM výstup vygenerován (DB není dostupná – výstup nebyl uložen)
              </span>
            )}
            {isSaved && msg.projectId ? (
              <Link
                href={`/projects/${msg.projectId}`}
                className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-700"
              >
                Zobrazit v projektu →
              </Link>
            ) : null}
          </div>
          <AiOutput
            content={msg.content}
            downloadFilename={
              selectedProject
                ? `pm-vystup-${sanitizeFilename(selectedProject.name)}`
                : "pm-vystup"
            }
            sessionId={msg.sessionId}
          />
          {isSaved && msg.projectId ? (
            <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
              💾 Výstup je uložen v historii projektu. Kdykoli se k němu vrátíš přes{" "}
              <Link href={`/projects/${msg.projectId}`} className="font-medium underline">
                detail projektu
              </Link>
              .
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (msg.kind === "error") {
    return (
      <div className="flex items-start gap-3">
        <AiAvatar />
        <div className="rounded-2xl rounded-tl-sm bg-[#fff2f2] px-4 py-3 text-[14px] text-[#c0392b] shadow-apple-sm">
          {msg.text}
        </div>
      </div>
    );
  }

  return null;
}

import type { RefObject } from "react";
import type { Status, ChatMode } from "../types";

type Props = {
  inputRef: RefObject<HTMLTextAreaElement>;
  inputValue: string;
  setInputValue: (v: string) => void;
  onSend: () => void;
  status: Status;
  chatMode: ChatMode;
};

export function ChatInput({ inputRef, inputValue, setInputValue, onSend, status, chatMode }: Props) {
  const isLoading =
    chatMode === "routing" ||
    chatMode === "canvas" ||
    status === "loading_q" ||
    status === "loading_fu" ||
    status === "loading_clarify";

  if (isLoading) {
    return <p className="py-3 text-center text-sm text-slate-400">AI přemýšlí…</p>;
  }

  if (chatMode === "guide" && status === "awaiting_fu") {
    return (
      <p className="py-3 text-center text-sm text-slate-400">
        Odpověz na doplňující otázky výše a klikni &ldquo;Přejít na další →&rdquo;
      </p>
    );
  }

  const isActive = chatMode === "idle" || (chatMode === "guide" && status === "awaiting_answer");
  const canSend = isActive && inputValue.trim().length > 0;

  const placeholder =
    chatMode === "guide" && status === "awaiting_answer"
      ? "Tvoje odpověď… (Enter = odeslat, Shift+Enter = nový řádek)"
      : "Napiš zprávu… (Enter = odeslat)";

  return (
    <div className="flex items-end gap-3">
      <textarea
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSend();
          }
        }}
        rows={chatMode === "guide" && status === "awaiting_answer" ? 3 : 2}
        disabled={!isActive}
        placeholder={placeholder}
        className="flex-1 resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:opacity-40"
      />
      <button
        onClick={onSend}
        disabled={!canSend}
        className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
        title="Odeslat (Enter)"
        aria-label="Odeslat zprávu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
        </svg>
      </button>
    </div>
  );
}

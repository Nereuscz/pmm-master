import type { RefObject } from "react";
import type { Status } from "../types";

type Props = {
  inputRef: RefObject<HTMLTextAreaElement>;
  inputValue: string;
  setInputValue: (v: string) => void;
  onSend: () => void;
  status: Status;
};

export function ChatInput({ inputRef, inputValue, setInputValue, onSend, status }: Props) {
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
  if (status === "loading_q" || status === "loading_fu" || status === "loading_clarify") {
    return <p className="py-3 text-center text-sm text-slate-400">AI přemýšlí...</p>;
  }

  const canSend = status === "awaiting_answer" && inputValue.trim().length > 0;

  return (
    <div className="flex items-end gap-3">
      <textarea
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        rows={3}
        disabled={status !== "awaiting_answer"}
        placeholder="Tvoje odpověď… (Enter = odeslat, Shift+Enter = nový řádek)"
        className="flex-1 resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:opacity-40"
      />
      <button
        onClick={onSend}
        disabled={!canSend}
        className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
        title="Odeslat (Enter)"
        aria-label="Odeslat odpověď"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
        </svg>
      </button>
    </div>
  );
}

import { useRef } from "react";
import type { RefObject } from "react";
import type { Status, ChatMode } from "../types";

type Props = {
  inputRef: RefObject<HTMLTextAreaElement>;
  inputValue: string;
  setInputValue: (v: string) => void;
  onSend: () => void;
  status: Status;
  chatMode: ChatMode;
  onAttachment?: (file: File) => Promise<void>;
};

export function ChatInput({ inputRef, inputValue, setInputValue, onSend, status, chatMode, onAttachment }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      {onAttachment && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md,.mp3,.wav,.m4a,.webm,.mp4,.mpeg,.ogg,audio/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                await onAttachment(file);
                e.target.value = "";
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isActive}
            className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e8e8ed] bg-white text-[#6e6e73] transition-colors hover:bg-[#f2f2f7] hover:text-[#1d1d1f] disabled:opacity-40"
            title="Přidat přílohu"
            aria-label="Přidat přílohu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-4.5 4.5a2.25 2.25 0 01-3.182-3.18l.001-.001 4.5-4.5a.75.75 0 111.061 1.06l-4.5 4.5a.75.75 0 001.061 1.06l4.5-4.5a3 3 0 000-4.242z" />
            </svg>
          </button>
        </>
      )}
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

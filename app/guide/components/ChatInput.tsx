import { useRef, useCallback } from "react";
import type { RefObject } from "react";
import type { Status, ChatMode } from "../types";
import { useVoiceInput } from "../hooks/useVoiceInput";

type Props = {
  inputRef: RefObject<HTMLTextAreaElement>;
  inputValue: string;
  setInputValue: (v: string) => void;
  onSend: () => void;
  status: Status;
  chatMode: ChatMode;
  voiceMode?: boolean;
  onVoiceModeChange?: (v: boolean) => void;
  realtimeConnected?: boolean;
  onAttachment?: (file: File) => Promise<void>;
};

export function ChatInput({ inputRef, inputValue, setInputValue, onSend, status, chatMode, voiceMode = false, onVoiceModeChange, realtimeConnected = false, onAttachment }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { error: voiceError, startRecording, stopRecording, isRecording, isTranscribing } = useVoiceInput(
    (text) => {
      setInputValue(text);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  );

  const isActive = chatMode === "idle" || (chatMode === "guide" && status === "awaiting_answer");

  const handleFileDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (!onAttachment || !isActive) return;
      const file = e.dataTransfer.files?.[0];
      if (file) await onAttachment(file);
    },
    [onAttachment, isActive]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (onAttachment && isActive) e.dataTransfer.dropEffect = "copy";
  }, [onAttachment, isActive]);

  const isLoading =
    chatMode === "routing" ||
    chatMode === "canvas" ||
    status === "loading_q" ||
    status === "loading_fu" ||
    status === "loading_clarify";

  if (isLoading) {
    const loadingText =
      status === "loading_q" ? "AI připravuje další otázku…" :
      status === "loading_fu" ? "AI generuje doplňující otázky…" :
      status === "loading_clarify" ? "AI vysvětluje otázku…" :
      chatMode === "routing" ? "Zpracovávám požadavek…" :
      "AI přemýšlí…";
    return (
      <div className="flex items-center justify-center gap-2 py-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <p className="text-sm text-apple-text-secondary">{loadingText}</p>
      </div>
    );
  }

  if (chatMode === "guide" && status === "awaiting_fu") {
    return (
      <p className="py-3 text-center text-sm text-slate-400">
        Odpověz na doplňující otázky výše a klikni &ldquo;Přejít na další →&rdquo;
      </p>
    );
  }

  const canSend = isActive && inputValue.trim().length > 0;
  const showVoiceInput = voiceMode && chatMode === "guide" && status === "awaiting_answer" && !realtimeConnected;

  const placeholder =
    chatMode === "guide" && status === "awaiting_answer"
      ? "Tvoje odpověď… (Enter = odeslat, Shift+Enter = nový řádek)"
      : "Napiš zprávu… (Enter = odeslat)";

  return (
    <div className="flex flex-col gap-3">
      {voiceError && (
        <p className="text-caption text-red-600">{voiceError}</p>
      )}
      <div
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
        className="flex items-end gap-3 rounded-2xl border border-apple-border-default bg-apple-bg-subtle px-3 py-2.5 shadow-apple-sm transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20"
      >
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-apple-text-tertiary transition-colors hover:bg-white hover:text-brand-600 disabled:opacity-40"
            title="Přidat soubor (PDF, audio, dokument)"
            aria-label="Přidat přílohu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-4.5 4.5a2.25 2.25 0 01-3.182-3.18l.001-.001 4.5-4.5a.75.75 0 111.061 1.06l-4.5 4.5a.75.75 0 001.061 1.06l4.5-4.5a3 3 0 000-4.242z" />
            </svg>
          </button>
        </>
      )}
      {onVoiceModeChange && (
        <button
          type="button"
          onClick={() => onVoiceModeChange(!voiceMode)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 ${
            voiceMode
              ? "bg-brand-100 text-brand-700"
              : "text-apple-text-tertiary hover:bg-white hover:text-brand-600"
          }`}
          title={voiceMode ? "Vypnout hlasový režim" : "Zapnout hlasový režim"}
          aria-label={voiceMode ? "Vypnout hlasový režim" : "Zapnout hlasový režim"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
            <path fillRule="evenodd" d="M5 9.643a.75.75 0 01-1.5 0V4.643a.75.75 0 011.5 0v5z" clipRule="evenodd" />
            <path d="M3 8.643a.75.75 0 00-1.5 0v1a6 6 0 1012 0v-1a.75.75 0 00-1.5 0v1a4.5 4.5 0 01-9 0v-1z" />
          </svg>
        </button>
      )}
      {showVoiceInput && (
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isTranscribing}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 ${
            isRecording
              ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
              : isTranscribing
                ? "bg-[#e8e8ed] text-[#6e6e73] cursor-wait"
                : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
          title={isRecording ? "Ukončit nahrávání" : isTranscribing ? "Přepisuji…" : "Nahrát odpověď hlasem"}
          aria-label={isRecording ? "Ukončit nahrávání" : isTranscribing ? "Přepisuji" : "Nahrát odpověď hlasem"}
        >
          {isTranscribing ? (
            <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
              <path fillRule="evenodd" d="M5 9.643a.75.75 0 01-1.5 0V4.643a.75.75 0 011.5 0v5z" clipRule="evenodd" />
              <path d="M3 8.643a.75.75 0 00-1.5 0v1a6 6 0 1012 0v-1a.75.75 0 00-1.5 0v1a4.5 4.5 0 01-9 0v-1z" />
            </svg>
          )}
        </button>
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
        className="min-w-0 flex-1 resize-none rounded-xl border-0 bg-transparent px-3 py-2.5 text-body placeholder:text-apple-text-muted focus:outline-none focus:ring-0 disabled:opacity-40"
      />
      <button
        onClick={onSend}
        disabled={!canSend}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
        title="Odeslat (Enter)"
        aria-label="Odeslat zprávu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
        </svg>
      </button>
    </div>
    </div>
  );
}

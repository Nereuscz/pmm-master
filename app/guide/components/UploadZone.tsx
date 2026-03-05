"use client";

import { useRef, useCallback, useState } from "react";

const AUDIO_EXTS = ["mp3", "wav", "m4a", "webm", "mp4", "mpeg", "ogg"];
const DOC_EXTS = ["pdf", "docx", "doc", "txt", "md"];

type Props = {
  uploadedContext: string;
  onAddContext: (text: string) => void;
  onClearContext: () => void;
  onPrefill: () => void;
  isPrefilling?: boolean;
  disabled?: boolean;
};

export function UploadZone({
  uploadedContext,
  onAddContext,
  onClearContext,
  onPrefill,
  isPrefilling,
  disabled
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      const isAudio = AUDIO_EXTS.includes(ext);
      const isDoc = DOC_EXTS.includes(ext);

      if (!isAudio && !isDoc) {
        setUploadError("Nepodporovaný formát. Povoleno: PDF, DOCX, TXT, MD nebo MP3, WAV, M4A.");
        return;
      }

      setUploading(true);
      setUploadError(null);

      try {
        const fd = new FormData();
        fd.append("file", file);

        const url = isAudio ? "/api/guide/transcribe" : "/api/guide/parse-attachment";
        const r = await fetch(url, { method: "POST", body: fd });
        const json = await r.json();

        if (!r.ok) {
          setUploadError(json.error ?? "Chyba nahrávání");
          return;
        }

        const text = json.text ?? "";
        if (text.trim()) onAddContext(text);
      } catch {
        setUploadError("Nepodařilo se zpracovat soubor.");
      } finally {
        setUploading(false);
      }
    },
    [onAddContext]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled || uploading) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [disabled, uploading, handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const hasContent = uploadedContext.trim().length > 0;

  return (
    <div className="space-y-2">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={`rounded-xl border-2 border-dashed px-4 py-3 transition-colors ${
          disabled || uploading
            ? "border-[#e8e8ed] bg-[#fafafa] opacity-60"
            : "border-[#d2d2d7] bg-white hover:border-brand-400 hover:bg-brand-50/30"
        }`}
      >
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md,.mp3,.wav,.m4a,.webm,.mp4,.mpeg,.ogg,audio/*"
            onChange={onInputChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {uploading ? "Načítám…" : "Nahrát soubor"}
          </button>
          <span className="text-[12px] text-[#6e6e73]">
            Audio (MP3, WAV, M4A) nebo dokument (PDF, DOCX, TXT, MD)
          </span>
        </div>
        {uploadError && (
          <p className="mt-2 text-[12px] text-red-600">{uploadError}</p>
        )}
      </div>

      {hasContent && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-[#6e6e73]">
            {uploadedContext.length} znaků nahraného obsahu
          </span>
          <button
            type="button"
            onClick={onPrefill}
            disabled={disabled || isPrefilling}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {isPrefilling ? "Předvyplňuji…" : "Předvyplnit canvas"}
          </button>
          <button
            type="button"
            onClick={onClearContext}
            disabled={disabled}
            className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f]"
          >
            Zrušit
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";

export type VoiceInputState = "idle" | "recording" | "transcribing";

export function useVoiceInput(onTranscribed: (text: string) => void) {
  const [state, setState] = useState<VoiceInputState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });

        setState("transcribing");
        try {
          const fd = new FormData();
          fd.append("file", file);
          const r = await fetch("/api/guide/transcribe", { method: "POST", body: fd });
          const json = await r.json();

          if (!r.ok) throw new Error(json.error || "Chyba přepisu");
          const text = (json.text ?? "").trim();
          if (text) onTranscribed(text);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Nepodařilo se přepsat nahrávku.");
        } finally {
          setState("idle");
        }
      };

      mediaRecorder.start();
      setState("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodařilo se spustit mikrofon.");
      setState("idle");
    }
  }, [onTranscribed]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setState("idle");
      setError(null);
    }
  }, []);

  return {
    state,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: state === "recording",
    isTranscribing: state === "transcribing",
  };
}

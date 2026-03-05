"use client";

import { useEffect, useCallback } from "react";
import { speak, stopSpeaking } from "@/lib/voice";

/**
 * Hook to speak text when voice mode is on.
 * Call speakText(text) when a new question/clarification appears.
 */
export function useTTS(voiceMode: boolean) {
  const speakText = useCallback(
    (text: string) => {
      if (voiceMode && text?.trim()) {
        speak(text);
      }
    },
    [voiceMode]
  );

  // Cleanup on unmount or when voice mode turns off
  useEffect(() => {
    if (!voiceMode) {
      stopSpeaking();
    }
    return () => stopSpeaking();
  }, [voiceMode]);

  return { speakText, stopSpeaking };
}

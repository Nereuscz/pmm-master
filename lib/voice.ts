/**
 * Text-to-Speech utilities using Web Speech API (SpeechSynthesis).
 * Works in Chrome, Edge, Safari. No external services required.
 */

const DEFAULT_LANG = "cs-CZ";

export function speak(text: string, lang = DEFAULT_LANG): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.95;
  utterance.pitch = 1;

  // Prefer Czech voice if available
  const voices = window.speechSynthesis.getVoices();
  const czechVoice = voices.find((v) => v.lang.startsWith("cs"));
  if (czechVoice) utterance.voice = czechVoice;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

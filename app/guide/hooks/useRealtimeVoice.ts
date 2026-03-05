"use client";

import { useState, useCallback, useRef } from "react";
import type { Answer, GuideQ } from "../types";

export type RealtimeState = "disconnected" | "connecting" | "connected" | "error";

export type UseRealtimeVoiceCallbacks = {
  onNextQuestion: (q: GuideQ) => void;
  onDone: (output: string, sessionId?: string, projectId?: string) => void;
  onTranscript?: (text: string) => void;
};

export function useRealtimeVoice(callbacks: UseRealtimeVoiceCallbacks) {
  const [state, setState] = useState<RealtimeState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const answersRef = useRef<Answer[]>([]);
  const currentQRef = useRef<GuideQ | null>(null);

  const sendEvent = useCallback((event: object) => {
    const dc = dcRef.current;
    if (dc?.readyState === "open") {
      dc.send(JSON.stringify(event));
    }
  }, []);

  const handleSubmitAnswer = useCallback(
    async (answer: string) => {
      const ctx = (window as unknown as { __realtimeCtx?: { projectId: string; phase: string; framework: string } }).__realtimeCtx;
      if (!ctx?.projectId) {
        return JSON.stringify({ success: false, error: "Chybí kontext projektu." });
      }

      const { getQuestionsForPhase } = await import("@/lib/guide");
      const questions = getQuestionsForPhase(ctx.phase ?? "Iniciace", (ctx.framework ?? "Univerzální") as "Univerzální" | "Produktový");
      const currentQ = currentQRef.current ?? questions[answersRef.current.length];
      if (!currentQ) {
        return JSON.stringify({ success: false, error: "Žádná aktuální otázka." });
      }

      const newAnswers: Answer[] = [
        ...answersRef.current,
        { questionId: currentQ.id, question: currentQ.text, answer },
      ];
      answersRef.current = newAnswers;

      try {
        const r = await fetch("/api/guide/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: ctx.projectId,
            phase: ctx.phase ?? "Iniciace",
            framework: ctx.framework ?? "Univerzální",
            answers: newAnswers,
          }),
        });
        const json = await r.json();

        if (!r.ok) {
          return JSON.stringify({ success: false, error: json.error ?? "Chyba průvodce." });
        }

        if (json.done) {
          return JSON.stringify({
            success: true,
            done: true,
            output: json.output,
            sessionId: json.sessionId,
            projectId: json.projectId,
          });
        }

        const nextQ = json.nextQuestion as GuideQ;
        currentQRef.current = nextQ;
        return JSON.stringify({
          success: true,
          done: false,
          nextQuestion: nextQ,
        });
      } catch (e) {
        return JSON.stringify({
          success: false,
          error: e instanceof Error ? e.message : "Nepodařilo se odeslat odpověď.",
        });
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioElRef.current?.remove();
    audioElRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    (window as unknown as { __realtimeCtx?: object }).__realtimeCtx = undefined;
    setState((s) => (s === "error" ? s : "disconnected"));
  }, []);

  const connect = useCallback(
    async (projectId: string, phase: string, framework: string, initialAnswers: Answer[] = []) => {
      setState("connecting");
      setError(null);
      answersRef.current = initialAnswers;

      const { getQuestionsForPhase } = await import("@/lib/guide");
      const questions = getQuestionsForPhase(phase, framework as "Univerzální" | "Produktový");
      currentQRef.current = questions[initialAnswers.length] ?? questions[0] ?? null;

      (window as unknown as { __realtimeCtx?: object }).__realtimeCtx = {
        projectId,
        phase,
        framework,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        pc.addTrack(stream.getTracks()[0]);

        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioElRef.current = audioEl;
        document.body.appendChild(audioEl);
        pc.ontrack = (e) => {
          audioEl.srcObject = e.streams[0];
        };

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;

        const triggerFirstResponseRef = { done: false };
        dc.addEventListener("message", (e) => {
          try {
            const ev = JSON.parse(e.data) as {
              type?: string;
              response?: { output?: Array<{ type?: string; name?: string; call_id?: string; arguments?: string }> };
              delta?: string;
            };

            if ((ev.type === "session.created" || ev.type === "session.updated") && !triggerFirstResponseRef.done) {
              triggerFirstResponseRef.done = true;
              sendEvent({ type: "response.create" });
            }

            if (ev.type === "response.output_audio_transcript.delta" && ev.delta) {
              callbacks.onTranscript?.(ev.delta);
            }

            if (ev.type === "response.done" && ev.response?.output?.[0]?.type === "function_call") {
              const out = ev.response.output[0];
              if (out.name === "submit_answer" && out.call_id) {
                const args = JSON.parse(out.arguments ?? "{}") as { answer?: string };
                const answer = args.answer ?? "";
                handleSubmitAnswer(answer).then((resultJson) => {
                  sendEvent({
                    type: "conversation.item.create",
                    item: {
                      type: "function_call_output",
                      call_id: out.call_id,
                      output: resultJson,
                    },
                  });
                  sendEvent({ type: "response.create" });

                  const result = JSON.parse(resultJson) as {
                    success?: boolean;
                    done?: boolean;
                    output?: string;
                    sessionId?: string;
                    projectId?: string;
                    nextQuestion?: GuideQ;
                  };
                  if (result.success && result.done && result.output) {
                    callbacks.onDone(result.output, result.sessionId, result.projectId);
                  } else if (result.success && result.nextQuestion) {
                    callbacks.onNextQuestion(result.nextQuestion);
                  }
                });
              }
            }
          } catch {
            // ignore parse errors
          }
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const url = `/api/realtime/session?projectId=${encodeURIComponent(projectId)}&phase=${encodeURIComponent(phase)}&framework=${encodeURIComponent(framework)}`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp ?? undefined,
        });

        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Nepodařilo se připojit.");
        }

        const sdpAnswer = await r.text();
        await pc.setRemoteDescription({
          type: "answer",
          sdp: sdpAnswer,
        });

        await new Promise<void>((resolve, reject) => {
          dc.onopen = () => resolve();
          dc.onerror = () => reject(new Error("Data channel error"));
        });

        setState("connected");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba připojení");
        setState("error");
        disconnect();
      }
    },
    [callbacks, handleSubmitAnswer, sendEvent, disconnect]
  );

  return { state, error, connect, disconnect, sendEvent };
}

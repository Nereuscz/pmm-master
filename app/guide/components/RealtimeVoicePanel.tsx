"use client";

import type { RealtimeState } from "../hooks/useRealtimeVoice";

type Props = {
  projectId: string | null;
  state: RealtimeState;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function RealtimeVoicePanel({
  projectId,
  state,
  error,
  onConnect,
  onDisconnect,
}: Props) {

  if (!projectId) return null;

  if (state === "connected") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-[12px] text-green-800">
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        Plynulý hlasový režim – mluvte
        <button
          type="button"
          onClick={onDisconnect}
          className="ml-auto rounded px-2 py-1 text-[11px] font-medium hover:bg-green-100"
        >
          Odpojit
        </button>
      </div>
    );
  }

  if (state === "connecting") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Připojování…
      </div>
    );
  }

  if (state === "error" && error) {
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-800">
        <span>{error}</span>
        <button
          type="button"
          onClick={onConnect}
          className="self-start rounded px-2 py-1 font-medium hover:bg-red-100"
        >
          Zkusit znovu
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={projectId ? onConnect : undefined}
      disabled={!projectId}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-3 py-2 text-[12px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
      title="Plynulá hlasová konverzace místo push-to-talk"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
        <path fillRule="evenodd" d="M5 9.643a.75.75 0 01-1.5 0V4.643a.75.75 0 011.5 0v5z" clipRule="evenodd" />
        <path d="M3 8.643a.75.75 0 00-1.5 0v1a6 6 0 1012 0v-1a.75.75 0 00-1.5 0v1a4.5 4.5 0 01-9 0v-1z" />
      </svg>
      Zapnout plynulý hlasový režim
    </button>
  );
}

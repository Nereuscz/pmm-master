import type { GuideDraft } from "../types";

type Props = {
  draft: GuideDraft;
  onResume: () => void;
  onStartFresh: () => void;
};

export function ResumeModal({ draft, onResume, onStartFresh }: Props) {
  const count = draft.answers.length;
  const countLabel = count === 1 ? "otázka" : count < 5 ? "otázky" : "otázek";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-apple bg-white p-6 shadow-apple">
        <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Máš rozpracovaný chat</h2>
        <p className="mt-2 text-[14px] text-[#6e6e73]">
          Naposledy uloženo{" "}
          {new Date(draft.updated_at).toLocaleString("cs-CZ")}.{" "}
          Chceš pokračovat tam, kde jsi skončil/a?
        </p>
        <p className="mt-1 text-[13px] text-[#aeaeb2]">
          {count} {countLabel} zodpovězeno
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onResume}
            className="flex-1 rounded-full bg-brand-600 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-700"
          >
            Pokračovat →
          </button>
          <button
            onClick={onStartFresh}
            className="flex-1 rounded-full border border-[#d2d2d7] py-2 text-[14px] font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
          >
            Začít znovu
          </button>
        </div>
      </div>
    </div>
  );
}

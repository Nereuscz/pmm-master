"use client";

type Props = {
  charCount: number;
  onPrefill: () => void;
  onClear: () => void;
  isPrefilling?: boolean;
  disabled?: boolean;
};

export function UploadedContextBar({
  charCount,
  onPrefill,
  onClear,
  isPrefilling,
  disabled
}: Props) {
  const formatted = charCount >= 1000 ? `${(charCount / 1000).toFixed(1)}k` : charCount.toString();

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-50/60 px-3 py-2 text-[12px]">
      <span className="text-brand-700">
        <span className="font-medium">Kontext:</span> {formatted} znaků
      </span>
      <span className="text-brand-300">·</span>
      <button
        type="button"
        onClick={onPrefill}
        disabled={disabled || isPrefilling}
        className="font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50"
      >
        {isPrefilling ? "Předvyplňuji…" : "Předvyplnit canvas"}
      </button>
      <span className="text-brand-300">·</span>
      <button
        type="button"
        onClick={onClear}
        disabled={disabled}
        className="text-brand-600 hover:text-brand-800 disabled:opacity-50"
      >
        Zrušit
      </button>
    </div>
  );
}

"use client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Smazat",
  cancelLabel = "Zrušit",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-sm rounded-apple bg-white p-6 shadow-apple-lg">
        <h2 id="confirm-dialog-title" className="text-[17px] font-semibold text-[#1d1d1f]">
          {title}
        </h2>
        <p className="mt-2 text-[14px] text-[#6e6e73]">{message}</p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-full border border-[#d2d2d7] px-4 py-2 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-full px-4 py-2 text-[14px] font-medium text-white transition-colors disabled:opacity-50 ${
              variant === "danger"
                ? "bg-[#ff3b30] hover:bg-[#e03029]"
                : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Mažu…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

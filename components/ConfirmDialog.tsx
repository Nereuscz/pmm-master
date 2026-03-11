"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
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
  loadingLabel = "Mažu…",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap + Escape key + inert background
  useEffect(() => {
    if (!open) return;

    // Set inert on sibling elements to prevent tabbing outside
    const overlay = overlayRef.current;
    const siblings = overlay
      ? Array.from(document.body.children).filter((el) => el !== overlay)
      : [];
    siblings.forEach((el) => el.setAttribute("inert", ""));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!loading) onCancel();
        return;
      }
      if (e.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"]:not([disabled])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    cancelButtonRef.current?.focus();
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      siblings.forEach((el) => el.removeAttribute("inert"));
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div ref={dialogRef} className="w-full max-w-sm rounded-apple bg-apple-bg-card p-6 shadow-apple-lg" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-dialog-title" className="text-headline font-semibold text-apple-text-primary">
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="mt-2 text-body text-apple-text-secondary">
          {message}
        </p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-full border border-apple-border-default px-4 py-2 text-body font-medium text-apple-text-primary transition-colors duration-200 hover:bg-apple-bg-page active:scale-[0.98] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-full px-4 py-2 text-body font-medium text-white transition-colors duration-200 active:scale-[0.98] disabled:opacity-50 ${
              variant === "danger"
                ? "bg-semantic-danger hover:bg-semantic-danger-hover"
                : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                {loadingLabel}
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

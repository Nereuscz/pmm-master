"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6">
      <div className="max-w-md rounded-apple bg-apple-bg-card p-8 text-center shadow-apple">
        <h2 className="text-headline font-semibold text-apple-text-primary">Něco se pokazilo</h2>
        <p className="mt-2 text-caption text-apple-text-secondary">
          Došlo k neočekávané chybě. Zkus stránku obnovit.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-full bg-brand-600 px-6 py-2.5 text-caption font-medium text-white transition-colors duration-200 hover:bg-brand-700 active:scale-[0.98]"
        >
          Obnovit stránku
        </button>
      </div>
    </div>
  );
}

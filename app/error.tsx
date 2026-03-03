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
      <div className="max-w-md rounded-apple bg-white p-8 text-center shadow-apple">
        <h2 className="text-[18px] font-semibold text-[#1d1d1f]">Něco se pokazilo</h2>
        <p className="mt-2 text-[14px] text-[#6e6e73]">
          Došlo k neočekávané chybě. Zkus stránku obnovit.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-full bg-brand-600 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand-700"
        >
          Obnovit stránku
        </button>
      </div>
    </div>
  );
}

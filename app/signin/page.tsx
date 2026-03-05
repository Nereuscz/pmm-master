"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <main className="flex min-h-screen items-center justify-center bg-apple-bg-page px-6">
      <div className="w-full max-w-sm rounded-apple bg-white p-10 shadow-apple-lg">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-apple-sm">
            <span className="text-[20px] font-bold text-white">PM</span>
          </div>
        </div>

        <h1 className="text-center text-title font-semibold tracking-tight text-apple-text-primary">
          PM Assistant
        </h1>
        <p className="mt-2 text-center text-body text-apple-text-secondary">
          Přihlaste se přes Asana účet.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-center text-[13px] text-red-600">
            Přihlášení se nepovedlo. Zkuste to znovu.
          </p>
        )}

        <button
          type="button"
          onClick={() => signIn("asana", { callbackUrl: "/dashboard" })}
          className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#f06a6a] py-3 text-body font-medium text-white transition-colors duration-200 hover:bg-[#e55a5a] active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.78 12.653a2.34 2.34 0 0 0 1.94-2.308 2.34 2.34 0 0 0-4.68 0 2.34 2.34 0 0 0 1.94 2.308 5.55 5.55 0 0 1-4.17 3.6 2.34 2.34 0 0 0-1.72 2.25 2.34 2.34 0 0 0 4.68 0 2.34 2.34 0 0 0-1.72-2.25 5.55 5.55 0 0 1 4.17-3.6zm-6.4 3.6a2.34 2.34 0 0 0 1.94-2.308 2.34 2.34 0 0 0-4.68 0 2.34 2.34 0 0 0 1.94 2.308 5.55 5.55 0 0 1-4.17 3.6 2.34 2.34 0 0 0-1.72 2.25 2.34 2.34 0 0 0 4.68 0 2.34 2.34 0 0 0-1.72-2.25 5.55 5.55 0 0 1 4.17-3.6zm-6.38 3.6a2.34 2.34 0 0 0 1.94-2.308 2.34 2.34 0 0 0-4.68 0 2.34 2.34 0 0 0 1.94 2.308 5.55 5.55 0 0 1-4.17 3.6 2.34 2.34 0 0 0-1.72 2.25 2.34 2.34 0 0 0 4.68 0 2.34 2.34 0 0 0-1.72-2.25 5.55 5.55 0 0 1 4.17-3.6z"/>
          </svg>
          Pokračovat přes Asana
        </button>

        <p className="mt-6 text-center text-footnote text-apple-text-muted">
          PM Assistant · JIC · v1.2
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-apple-bg-page px-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white" />
      </main>
    }>
      <SignInContent />
    </Suspense>
  );
}

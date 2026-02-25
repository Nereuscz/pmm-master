"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Přihlášení</h1>
        <p className="mt-2 text-slate-600">
          Přihlaste se přes Microsoft účet JIC.
        </p>
        <button
          type="button"
          onClick={() => signIn("azure-ad")}
          className="mt-6 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Pokračovat přes Microsoft
        </button>
      </div>
    </main>
  );
}

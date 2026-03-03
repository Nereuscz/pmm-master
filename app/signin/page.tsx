"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-6">
      <div className="w-full max-w-sm rounded-apple bg-white p-10 shadow-apple-lg">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-apple-sm">
            <span className="text-[20px] font-bold text-white">PM</span>
          </div>
        </div>

        <h1 className="text-center text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
          PM Assistant
        </h1>
        <p className="mt-2 text-center text-[15px] text-[#6e6e73]">
          Přihlaste se přes Asana účet.
        </p>

        <button
          type="button"
          onClick={() => signIn("asana")}
          className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#f06a6a] py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#e55a5a]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.78 12.653a2.34 2.34 0 0 0 1.94-2.308 2.34 2.34 0 0 0-4.68 0 2.34 2.34 0 0 0 1.94 2.308 5.55 5.55 0 0 1-4.17 3.6 2.34 2.34 0 0 0-1.72 2.25 2.34 2.34 0 0 0 4.68 0 2.34 2.34 0 0 0-1.72-2.25 5.55 5.55 0 0 1 4.17-3.6zm-6.4 3.6a2.34 2.34 0 0 0 1.94-2.308 2.34 2.34 0 0 0-4.68 0 2.34 2.34 0 0 0 1.94 2.308 5.55 5.55 0 0 1-4.17 3.6 2.34 2.34 0 0 0-1.72 2.25 2.34 2.34 0 0 0 4.68 0 2.34 2.34 0 0 0-1.72-2.25 5.55 5.55 0 0 1 4.17-3.6zm-6.38 3.6a2.34 2.34 0 0 0 1.94-2.308 2.34 2.34 0 0 0-4.68 0 2.34 2.34 0 0 0 1.94 2.308 5.55 5.55 0 0 1-4.17 3.6 2.34 2.34 0 0 0-1.72 2.25 2.34 2.34 0 0 0 4.68 0 2.34 2.34 0 0 0-1.72-2.25 5.55 5.55 0 0 1 4.17-3.6z"/>
          </svg>
          Pokračovat přes Asana
        </button>

        <p className="mt-6 text-center text-[12px] text-[#aeaeb2]">
          PM Assistant · JIC · v1.2
        </p>
      </div>
    </main>
  );
}

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
          Přihlaste se přes Microsoft účet JIC.
        </p>

        <button
          type="button"
          onClick={() => signIn("azure-ad")}
          className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-full bg-brand-600 py-3 text-[15px] font-medium text-white transition-colors hover:bg-brand-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 23 23">
            <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
            <path fill="#f35325" d="M1 1h10v10H1z"/>
            <path fill="#81bc06" d="M12 1h10v10H12z"/>
            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
            <path fill="#ffba08" d="M12 12h10v10H12z"/>
          </svg>
          Pokračovat přes Microsoft
        </button>

        <p className="mt-6 text-center text-[12px] text-[#aeaeb2]">
          PM Assistant · JIC · v1.2
        </p>
      </div>
    </main>
  );
}

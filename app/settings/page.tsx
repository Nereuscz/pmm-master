"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Breadcrumbs from "@/components/Breadcrumbs";
import ErrorMessage from "@/components/ErrorMessage";

export default function SettingsPage() {
  const [asanaToken, setAsanaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/settings/asana-token")
      .then((r) => r.json())
      .then((json) => setHasToken(json.hasToken === true))
      .catch(() => setHasToken(false));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = (e.currentTarget.elements.namedItem("token") as HTMLInputElement)?.value?.trim() ?? "";
      const r = await fetch("/api/settings/asana-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token || null }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Uložení selhalo.");
      toast.success(token ? "Asana token uložen." : "Asana token odstraněn.");
      setAsanaToken("");
      setHasToken(!!token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chyba";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-8 py-10">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Projekty", href: "/dashboard" }, { label: "Nastavení" }]} />
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">Nastavení</h1>
        <p className="mt-1 text-[15px] text-[#6e6e73]">Asana Personal Access Token pro export.</p>
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      ) : null}

      <section className="rounded-apple bg-white p-6 shadow-apple">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#86868b]">
          Asana integrace
        </h2>
        <p className="mt-2 text-[14px] text-[#6e6e73]">
          Pro export do Asany potřebuješ Personal Access Token. Získej ho v Asana → Můj profil →
          Aplikace → Personal Access Tokens.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#86868b]">
              Personal Access Token
            </label>
            <input
              name="token"
              type="password"
              value={asanaToken}
              onChange={(e) => setAsanaToken(e.target.value)}
              placeholder={hasToken ? "••••••••••••" : "Vlož token"}
              className="w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
            {hasToken === true ? (
              <p className="mt-1 text-[12px] text-[#6e6e73]">Token je uložen. Zadej nový pro změnu.</p>
            ) : null}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-brand-600 px-5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? "Ukládám…" : "Uložit"}
            </button>
            {hasToken ? (
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const r = await fetch("/api/settings/asana-token", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ token: null }),
                    });
                    const json = await r.json();
                    if (!r.ok) throw new Error(json.error || "Odstranění selhalo.");
                    toast.success("Asana token odstraněn.");
                    setHasToken(false);
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Chyba";
                    setError(msg);
                    toast.error(msg);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="rounded-full border border-[#d2d2d7] px-5 py-2 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50"
              >
                Odstranit token
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  );
}

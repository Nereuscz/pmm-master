"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Breadcrumbs from "@/components/Breadcrumbs";
import ErrorMessage from "@/components/ErrorMessage";

function SettingsContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch("/api/settings/asana-token")
      .then((r) => r.json())
      .then((json) => setHasToken(json.hasToken === true))
      .catch(() => setHasToken(false));
  }, []);

  useEffect(() => {
    const asana = searchParams.get("asana");
    if (asana === "connected") {
      toast.success("Asana úspěšně připojena.");
      setHasToken(true);
      window.history.replaceState({}, "", "/settings");
    } else if (asana === "error") {
      const msg = searchParams.get("msg");
      const text =
        msg === "config"
          ? "Asana OAuth není nakonfigurován. Nastav ASANA_CLIENT_ID a ASANA_CLIENT_SECRET."
          : msg === "token"
            ? "Nepodařilo se získat token z Asany."
            : msg === "save"
              ? "Nepodařilo se uložit token."
              : "Připojení k Asaně selhalo.";
      toast.error(text);
      setError(text);
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  async function handleDisconnect() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/settings/asana-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: null }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Odpojení selhalo.");
      toast.success("Asana odpojena.");
      setHasToken(false);
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
        <p className="mt-1 text-[15px] text-[#6e6e73]">Asana integrace pro export úkolů.</p>
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
          Pro export do Asany se připoj přes OAuth. Klikni na „Připojit Asana“ a autorizuj aplikaci
          ve svém Asana účtu.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {hasToken ? (
            <>
              <span className="text-[14px] font-medium text-[#34c759]">Připojeno</span>
              <button
                type="button"
                disabled={loading}
                onClick={handleDisconnect}
                className="rounded-full border border-[#d2d2d7] px-5 py-2 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50"
              >
                {loading ? "Odpojuji…" : "Odpojit"}
              </button>
            </>
          ) : (
            <a
              href="/api/auth/asana"
              className="rounded-full bg-brand-600 px-5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-700"
            >
              Připojit Asana
            </a>
          )}
        </div>
      </section>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-8 py-10">Načítám…</div>}>
      <SettingsContent />
    </Suspense>
  );
}

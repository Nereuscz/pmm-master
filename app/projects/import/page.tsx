"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Breadcrumbs from "@/components/Breadcrumbs";
import ErrorMessage from "@/components/ErrorMessage";

type ImportResult = { imported: number; updated?: number; errors?: string[] };

export default function ImportFromAsanaPage() {
  const [asanaProjectId, setAsanaProjectId] = useState("");
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    fetch("/api/settings/asana-token")
      .then((r) => r.json())
      .then((json) => setHasToken(json.hasToken === true))
      .catch(() => setHasToken(false));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const gid = asanaProjectId.trim();
    if (!gid) {
      setError("Zadej Asana project ID (GID).");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/asana/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asanaProjectId: gid }),
      });
      const text = await r.text();
      let json: { error?: string; imported?: number; updated?: number; errors?: string[] };
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(r.ok ? "Neplatná odpověď serveru." : `Import selhal (${r.status}).`);
      }
      if (!r.ok) throw new Error(json.error || "Import selhal.");
      setResult({
        imported: json.imported ?? 0,
        updated: json.updated ?? 0,
        errors: json.errors,
      });
      if ((json.imported ?? 0) > 0) {
        toast.success(`Importováno ${json.imported} projektů.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při importu.");
      toast.error(e instanceof Error ? e.message : "Chyba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-8 py-10">
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: "Projekty", href: "/dashboard" },
            { label: "Import z Asany" },
          ]}
        />
        <h1 className="mt-2 text-title font-semibold tracking-tight text-apple-text-primary">
          Import z Asany
        </h1>
        <p className="mt-1 text-body text-apple-text-secondary">
          Importuj parent tasky z Asana portfolia jako projekty. Fáze se při syncu automaticky
          aktualizuje podle custom fieldu „Project Phase“.
        </p>
      </div>

      {hasToken === null ? (
        <div className="rounded-apple bg-apple-bg-card p-6 shadow-apple">
          <p className="text-body text-apple-text-secondary animate-pulse">Ověřuji připojení k Asaně...</p>
        </div>
      ) : hasToken === false ? (
        <div className="rounded-apple bg-apple-bg-card p-6 shadow-apple">
          <p className="text-body text-apple-text-secondary">
            Pro import potřebuješ propojený Asana účet. Přihlas se přes Asana nebo propoj token v
            nastavení.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-block rounded-full bg-brand-600 px-5 py-2 text-body font-medium text-white hover:bg-brand-700"
          >
            Nastavení →
          </Link>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="space-y-6 rounded-apple bg-apple-bg-card p-8 shadow-apple"
        >
          <div>
            <label
              htmlFor="asana-project-id"
              className="mb-2 block text-caption font-semibold uppercase tracking-wider text-apple-text-tertiary"
            >
              Asana project ID (GID)
            </label>
            <input
              id="asana-project-id"
              type="text"
              value={asanaProjectId}
              onChange={(e) => setAsanaProjectId(e.target.value)}
              placeholder="1234567890123456"
              className="w-full rounded-xl border border-apple-border-default px-4 py-2.5 text-body text-apple-text-primary placeholder:text-apple-text-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              disabled={loading}
            />
            <p className="mt-2 text-caption text-apple-text-tertiary">
              GID najdeš v URL projektu v Asaně – např.{" "}
              <code className="rounded bg-apple-bg-subtle px-1.5 py-0.5 text-[12px]">
                app.asana.com/0/0/<strong>123456789</strong>
              </code>
            </p>
          </div>

          {error ? (
            <ErrorMessage id="import-error" message={error} />
          ) : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-brand-600 px-6 py-2.5 text-body font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? "Importuji…" : "Importovat"}
            </button>
            <Link
              href="/dashboard"
              className="rounded-full border border-apple-border-default px-5 py-2.5 text-body font-medium text-apple-text-primary hover:bg-apple-bg-page"
            >
              Zrušit
            </Link>
          </div>
        </form>
      )}

      {result ? (
        <div className="mt-6 rounded-apple bg-apple-bg-card p-6 shadow-apple">
          <h2 className="text-headline font-semibold text-apple-text-primary">Výsledek importu</h2>
          <p className="mt-2 text-body text-apple-text-secondary">
            Importováno: <strong>{result.imported}</strong>
            {(result.updated ?? 0) > 0 ? (
              <> · Aktualizováno: <strong>{result.updated}</strong></>
            ) : null}
          </p>
          {result.errors && result.errors.length > 0 ? (
            <div className="mt-4">
              <p className="text-caption font-semibold text-apple-text-tertiary">
                Chyby ({result.errors.length}):
              </p>
              <ul className="mt-2 max-h-40 overflow-y-auto text-caption text-apple-text-secondary">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.imported > 0 ? (
            <Link
              href="/dashboard"
              className="mt-4 inline-block rounded-full bg-brand-600 px-5 py-2 text-body font-medium text-white hover:bg-brand-700"
            >
              Zobrazit projekty →
            </Link>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

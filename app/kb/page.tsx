"use client";

import { useEffect, useState } from "react";

type DocumentRow = {
  id: string;
  title: string;
  category: string;
  source: string;
  created_at: string;
};

type SyncLog = {
  id: string;
  source_path: string;
  status: string;
  changes_detected: number;
  synced_at: string;
};

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function reload() {
    const [docsRes, logsRes] = await Promise.all([fetch("/api/kb/documents"), fetch("/api/kb/sync/logs")]);
    const [docsJson, logsJson] = await Promise.all([docsRes.json(), logsRes.json()]);
    if (!docsRes.ok) {
      throw new Error(docsJson.error || "Nepodařilo se načíst dokumenty.");
    }
    setDocuments(docsJson.documents ?? []);
    setLogs(logsJson.logs ?? []);
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : "Unknown error"));
  }, []);

  async function createDocument(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title: String(formData.get("title") || ""),
        category: String(formData.get("category") || ""),
        source: "upload",
        visibility: "global",
        content: String(formData.get("content") || "")
      };
      const response = await fetch("/api/kb/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Uložení dokumentu selhalo.");
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function runSimulatedSharepointSync() {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        sourcePath: "/sites/jic/shared/pm-docs",
        files: [
          {
            sharepointId: "sp_demo_1",
            title: "JIC Strategie 2026",
            category: "Strategie",
            content:
              "Strategický dokument: cíl je podpora scale-up firem, posílení inovačních KPI a koordinace mezi týmy."
          }
        ]
      };
      const response = await fetch("/api/kb/sync/sharepoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Sync selhal.");
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold">Znalostní báze (Admin)</h1>
      <p className="mt-2 text-slate-600">
        Správa dokumentů, reindexace a simulated SharePoint sync.
      </p>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Nahrát dokument</h2>
        <form action={createDocument} className="mt-4 space-y-3">
          <input
            name="title"
            placeholder="Název dokumentu"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <input
            name="category"
            placeholder="Kategorie (např. Strategie)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <textarea
            name="content"
            rows={6}
            placeholder="Obsah dokumentu..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Uložit dokument
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={runSimulatedSharepointSync}
              className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50"
            >
              Spustit simulated SharePoint sync
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Dokumenty</h2>
          <div className="mt-4 space-y-3">
            {documents.map((doc) => (
              <article key={doc.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium">{doc.title}</p>
                <p className="text-slate-600">
                  {doc.category} | {doc.source}
                </p>
              </article>
            ))}
            {documents.length === 0 ? <p className="text-sm text-slate-600">Žádné dokumenty.</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Sync log</h2>
          <div className="mt-4 space-y-3">
            {logs.map((log) => (
              <article key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium">{log.status}</p>
                <p className="text-slate-600">
                  {log.source_path} | změny: {log.changes_detected}
                </p>
              </article>
            ))}
            {logs.length === 0 ? <p className="text-sm text-slate-600">Žádné synchronizace.</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

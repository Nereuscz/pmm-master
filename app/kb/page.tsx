"use client";

import { useEffect, useRef, useState } from "react";

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

type UploadMode = "text" | "file";

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("file");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      if (uploadMode === "file") {
        const fileField = data.get("file");
        if (!(fileField instanceof File) || fileField.size === 0) {
          throw new Error("Vyberte soubor.");
        }
        const fd = new FormData();
        fd.append("file", fileField);
        fd.append("title", String(data.get("title") || fileField.name));
        fd.append("category", String(data.get("category") || ""));
        fd.append("visibility", "global");

        const response = await fetch("/api/kb/upload", { method: "POST", body: fd });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Nahrání selhalo.");
        setSuccess(`Soubor nahrán (${json.chunksCount} chunků, ${json.extractedLength} znaků).`);
      } else {
        const payload = {
          title: String(data.get("title") || ""),
          category: String(data.get("category") || ""),
          source: "upload",
          visibility: "global",
          content: String(data.get("content") || "")
        };
        const response = await fetch("/api/kb/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Uložení dokumentu selhalo.");
        setSuccess(`Dokument uložen (${json.chunksCount} chunků).`);
      }

      form.reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    setSuccess(null);
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
      if (!response.ok) throw new Error(json.error || "Sync selhal.");
      setSuccess("SharePoint sync dokončen.");
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
      {success ? <p className="mt-4 text-sm text-green-700">{success}</p> : null}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nahrát dokument</h2>
          <div className="flex rounded-lg border border-slate-200 p-1 text-sm">
            <button
              type="button"
              onClick={() => setUploadMode("file")}
              className={`rounded-md px-3 py-1 transition-colors ${
                uploadMode === "file"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Soubor
            </button>
            <button
              type="button"
              onClick={() => setUploadMode("text")}
              className={`rounded-md px-3 py-1 transition-colors ${
                uploadMode === "text"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Text
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            name="title"
            placeholder={uploadMode === "file" ? "Název dokumentu (volitelné – bere se z názvu souboru)" : "Název dokumentu"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="category"
            placeholder="Kategorie (např. Strategie)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          {uploadMode === "file" ? (
            <div className="rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center">
              <p className="text-sm text-slate-500">PDF, DOCX, DOC, TXT, MD — max 20 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                className="mt-2 text-sm"
              />
            </div>
          ) : (
            <textarea
              name="content"
              rows={6}
              placeholder="Obsah dokumentu..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Ukládám…" : "Uložit dokument"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={runSimulatedSharepointSync}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50"
            >
              Spustit simulated SharePoint sync
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Dokumenty ({documents.length})</h2>
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

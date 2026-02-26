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
  const [confirmDocId, setConfirmDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

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

  async function deleteDocument(id: string) {
    setDeletingDocId(id);
    setConfirmDocId(null);
    setError(null);
    try {
      const r = await fetch(`/api/kb/documents/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const json = await r.json();
        throw new Error(json.error || "Smazání selhalo");
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSuccess("Dokument smazán.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Smazání selhalo");
    } finally {
      setDeletingDocId(null);
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
          <div className="mt-4 space-y-2">
            {documents.map((doc) => (
              <article
                key={doc.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{doc.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {doc.category ? `${doc.category} · ` : ""}{doc.source} · {new Date(doc.created_at).toLocaleDateString("cs-CZ")}
                  </p>
                </div>

                {/* Mazání – inline potvrzení */}
                <div className="shrink-0">
                  {deletingDocId === doc.id ? (
                    <div className="flex h-7 w-7 items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                    </div>
                  ) : confirmDocId === doc.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">Smazat?</span>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Ano
                      </button>
                      <button
                        onClick={() => setConfirmDocId(null)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Ne
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDocId(doc.id)}
                      title="Smazat dokument"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </article>
            ))}
            {documents.length === 0 ? <p className="text-sm text-slate-500">Žádné dokumenty.</p> : null}
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

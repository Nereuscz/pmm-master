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
    if (!docsRes.ok) throw new Error(docsJson.error || "Nepodařilo se načíst dokumenty.");
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
        if (!(fileField instanceof File) || fileField.size === 0) throw new Error("Vyberte soubor.");
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
        files: [{
          sharepointId: "sp_demo_1",
          title: "JIC Strategie 2026",
          category: "Strategie",
          content: "Strategický dokument: cíl je podpora scale-up firem, posílení inovačních KPI a koordinace mezi týmy."
        }]
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
    <main className="mx-auto max-w-6xl px-8 py-10">
      {/* Hlavička */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">Znalostní báze</h1>
        <p className="mt-1 text-[15px] text-[#6e6e73]">Správa dokumentů, reindexace a SharePoint sync.</p>
      </div>

      {/* Notifikace */}
      {error ? (
        <div className="mb-4 rounded-apple bg-[#fff2f2] px-5 py-3 text-[14px] text-[#c0392b]">{error}</div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-apple bg-[#f0fdf4] px-5 py-3 text-[14px] text-[#1a7f37]">{success}</div>
      ) : null}

      {/* Upload sekce */}
      <section className="mb-6 rounded-apple bg-white p-6 shadow-apple">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#86868b]">Nahrát dokument</p>
          {/* Tab přepínač */}
          <div className="flex rounded-full border border-[#e8e8ed] bg-[#f5f5f7] p-1 text-[13px]">
            {(["file", "text"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setUploadMode(mode)}
                className={`rounded-full px-4 py-1.5 font-medium transition-all ${
                  uploadMode === mode
                    ? "bg-white text-[#1d1d1f] shadow-apple-sm"
                    : "text-[#6e6e73] hover:text-[#1d1d1f]"
                }`}
              >
                {mode === "file" ? "Soubor" : "Text"}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#86868b]">Název</label>
              <input
                name="title"
                placeholder={uploadMode === "file" ? "Volitelné – bere se z názvu souboru" : "Název dokumentu"}
                className="w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#86868b]">Kategorie</label>
              <input
                name="category"
                placeholder="Např. Strategie"
                className="w-full rounded-xl border border-[#d2d2d7] px-4 py-2.5 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </div>
          </div>

          {uploadMode === "file" ? (
            <div className="rounded-2xl border-2 border-dashed border-[#d2d2d7] px-6 py-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2 h-8 w-8 text-[#aeaeb2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-[13px] text-[#6e6e73]">PDF, DOCX, DOC, TXT, MD — max 20 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                className="mt-3 text-[13px] text-[#6e6e73]"
              />
            </div>
          ) : (
            <textarea
              name="content"
              rows={6}
              placeholder="Obsah dokumentu..."
              className="w-full resize-none rounded-xl border border-[#d2d2d7] px-4 py-3 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-brand-600 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? "Ukládám…" : "Uložit dokument"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={runSimulatedSharepointSync}
              className="rounded-full border border-[#d2d2d7] px-5 py-2.5 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50"
            >
              SharePoint sync
            </button>
          </div>
        </form>
      </section>

      {/* Dokumenty + Sync log */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Dokumenty */}
        <section className="rounded-apple bg-white p-6 shadow-apple">
          <div className="mb-4 flex items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#86868b]">Dokumenty</p>
            <span className="rounded-full bg-[#f2f2f7] px-2.5 py-0.5 text-[12px] font-medium text-[#6e6e73]">
              {documents.length}
            </span>
          </div>
          <div className="divide-y divide-[#f2f2f7]">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-[#1d1d1f]">{doc.title}</p>
                  <p className="mt-0.5 text-[12px] text-[#86868b]">
                    {doc.category ? `${doc.category} · ` : ""}{doc.source} · {new Date(doc.created_at).toLocaleDateString("cs-CZ")}
                  </p>
                </div>
                <div className="shrink-0">
                  {deletingDocId === doc.id ? (
                    <div className="flex h-7 w-7 items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#ff3b30] border-t-transparent" />
                    </div>
                  ) : confirmDocId === doc.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] text-[#6e6e73]">Smazat?</span>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="rounded-full bg-[#ff3b30] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#e03029]"
                      >
                        Ano
                      </button>
                      <button
                        onClick={() => setConfirmDocId(null)}
                        className="rounded-full border border-[#d2d2d7] px-2.5 py-1 text-[11px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
                      >
                        Ne
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDocId(doc.id)}
                      title="Smazat dokument"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#d2d2d7] transition-colors hover:bg-red-50 hover:text-[#ff3b30]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {documents.length === 0 ? (
              <p className="py-4 text-[14px] text-[#aeaeb2]">Žádné dokumenty.</p>
            ) : null}
          </div>
        </section>

        {/* Sync log */}
        <section className="rounded-apple bg-white p-6 shadow-apple">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[#86868b]">Sync log</p>
          <div className="divide-y divide-[#f2f2f7]">
            {logs.map((log) => (
              <div key={log.id} className="py-3">
                <p className="text-[14px] font-medium text-[#1d1d1f]">{log.status}</p>
                <p className="mt-0.5 font-mono text-[12px] text-[#6e6e73]">
                  {log.source_path} · změny: {log.changes_detected}
                </p>
              </div>
            ))}
            {logs.length === 0 ? (
              <p className="py-4 text-[14px] text-[#aeaeb2]">Žádné synchronizace.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

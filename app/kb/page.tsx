"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Breadcrumbs from "@/components/Breadcrumbs";
import ConfirmDialog from "@/components/ConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";

type DocumentRow = {
  id: string;
  title: string;
  category: string;
  source: string;
  source_url?: string | null;
  created_at: string;
};

type SyncLog = {
  id: string;
  source_path: string;
  status: string;
  changes_detected: number;
  synced_at: string;
};

type UploadMode = "text" | "file" | "url";

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploadMode, setUploadMode] = useState<UploadMode>("file");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDocId, setConfirmDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [refreshingDocId, setRefreshingDocId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const categories = [...new Set(documents.map((d) => d.category).filter(Boolean))].sort();
  const filteredDocuments = documents.filter((d) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || d.title.toLowerCase().includes(query);
    const matchesCategory = !categoryFilter || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  async function reload() {
    const [docsRes, logsRes] = await Promise.all([fetch("/api/kb/documents"), fetch("/api/kb/sync/logs")]);
    const [docsJson, logsJson] = await Promise.all([docsRes.json(), logsRes.json()]);
    if (!docsRes.ok) throw new Error(docsJson.error || "Nepodařilo se načíst dokumenty.");
    setDocuments(docsJson.documents ?? []);
    setLogs(logsJson.logs ?? []);
  }

  useEffect(() => {
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setInitialLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    if (uploadMode === "file") {
      const fileField = data.get("file");
      if (!(fileField instanceof File) || fileField.size === 0) {
        setUploadError("Vyberte soubor.");
        return;
      }
    } else if (uploadMode === "url") {
      const url = String(data.get("url") || "").trim();
      if (!url) {
        setUploadError("Zadejte URL adresu.");
        return;
      }
    } else {
      const title = String(data.get("title") || "").trim();
      const category = String(data.get("category") || "").trim();
      const content = String(data.get("content") || "").trim();
      if (title.length < 3) {
        setUploadError("Název musí mít alespoň 3 znaky.");
        return;
      }
      if (category.length < 2) {
        setUploadError("Kategorie musí mít alespoň 2 znaky.");
        return;
      }
      if (content.length < 20) {
        setUploadError("Obsah musí mít alespoň 20 znaků.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      if (uploadMode === "file") {
        const fileField = data.get("file") as File;
        const fd = new FormData();
        fd.append("file", fileField);
        fd.append("title", String(data.get("title") || fileField.name));
        fd.append("category", String(data.get("category") || ""));
        fd.append("visibility", "global");
        const response = await fetch("/api/kb/upload", { method: "POST", body: fd });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Nahrání selhalo.");
        toast.success(`Soubor nahrán (${json.chunksCount} chunků, ${json.extractedLength} znaků).`);
      } else if (uploadMode === "url") {
        const url = String(data.get("url") || "").trim();
        if (!url) throw new Error("Zadejte URL adresu.");
        const response = await fetch("/api/kb/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            title: String(data.get("title") || "").trim() || undefined,
            category: String(data.get("category") || "").trim() || undefined
          })
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Přidání URL selhalo.");
        toast.success(`URL přidána (${json.chunksCount} chunků, ${json.extractedLength} znaků).`);
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
        toast.success(`Dokument uložen (${json.chunksCount} chunků).`);
      }
      setUploadError(null);
      form.reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nepodařilo se uložit.";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function refreshDocument(id: string) {
    setRefreshingDocId(id);
    try {
      const r = await fetch(`/api/kb/documents/${id}/refresh`, { method: "POST" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Obnovení selhalo");
      toast.success(`Dokument obnoven (${json.chunksCount} chunků).`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Obnovení selhalo");
    } finally {
      setRefreshingDocId(null);
    }
  }

  async function deleteDocument(id: string) {
    setDeletingDocId(id);
    setConfirmDocId(null);
    try {
      const r = await fetch(`/api/kb/documents/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const json = await r.json();
        throw new Error(json.error || "Smazání selhalo");
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Dokument smazán.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Smazání selhalo");
    } finally {
      setDeletingDocId(null);
    }
  }

  async function runSimulatedSharepointSync() {
    setLoading(true);
    setError(null);
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
      toast.success("SharePoint sync dokončen.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-8 py-12">
      {/* Hlavička */}
      <div className="mb-8">
        <Breadcrumbs items={[{ label: "Projekty", href: "/dashboard" }, { label: "Znalostní báze" }]} />
        <h1 className="mt-2 text-title font-semibold tracking-tight text-apple-text-primary">Znalostní báze</h1>
        <p className="mt-1 text-body text-apple-text-secondary">Správa dokumentů, reindexace a SharePoint sync.</p>
      </div>

      {/* Chyba z načítání */}
      {error ? (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      ) : null}

      {/* Upload sekce */}
      <section id="kb-upload-section" className="mb-6 rounded-apple bg-white p-6 shadow-apple">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-footnote font-semibold uppercase tracking-widest text-apple-text-tertiary">Nahrát dokument</p>
          {/* Tab přepínač */}
          <div className="flex rounded-full border border-apple-border-light bg-apple-bg-page p-1 text-caption">
            {(["file", "url", "text"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setUploadMode(mode);
                  setUploadError(null);
                }}
                className={`rounded-full px-4 py-1.5 font-medium transition-all ${
                  uploadMode === mode
                    ? "bg-white text-apple-text-primary shadow-apple-sm"
                    : "text-apple-text-secondary hover:text-apple-text-primary"
                }`}
              >
                {mode === "file" ? "Soubor" : mode === "url" ? "URL" : "Text"}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-caption font-semibold uppercase tracking-wider text-apple-text-tertiary">Název</label>
              <input
                name="title"
                placeholder={uploadMode === "file" ? "Volitelné – bere se z názvu souboru" : "Název dokumentu"}
                className="w-full rounded-xl border border-apple-border-default px-4 py-2.5 text-body placeholder:text-apple-text-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-caption font-semibold uppercase tracking-wider text-apple-text-tertiary">Kategorie</label>
              <input
                name="category"
                placeholder="Např. Strategie"
                className="w-full rounded-xl border border-apple-border-default px-4 py-2.5 text-body placeholder:text-apple-text-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
              />
            </div>
          </div>

          {uploadMode === "file" ? (
            <div className="rounded-2xl border-2 border-dashed border-apple-border-default px-6 py-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2 h-8 w-8 text-apple-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-caption text-apple-text-secondary">PDF, DOCX, DOC, TXT, MD — max 20 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                className="mt-3 text-caption text-apple-text-secondary"
              />
            </div>
          ) : uploadMode === "url" ? (
            <div>
              <label className="mb-1.5 block text-caption font-semibold uppercase tracking-wider text-apple-text-tertiary">URL adresa</label>
              <input
                name="url"
                type="url"
                placeholder="https://example.com/clanek"
                className="w-full rounded-xl border border-apple-border-default px-4 py-2.5 text-body placeholder:text-apple-text-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
              />
              <p className="mt-1.5 text-caption text-apple-text-tertiary">
                Systém stáhne obsah stránky, extrahuje text a přidá ho do znalostní báze.
              </p>
            </div>
          ) : (
            <textarea
              name="content"
              rows={6}
              placeholder="Obsah dokumentu..."
              className="w-full resize-none rounded-xl border border-apple-border-default px-4 py-3 text-body placeholder:text-apple-text-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
            />
          )}

          {uploadError ? (
            <ErrorMessage id="kb-upload-error" message={uploadError} />
          ) : null}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              aria-describedby={uploadError ? "kb-upload-error" : undefined}
              className="rounded-full bg-brand-600 px-6 py-2.5 text-body font-medium text-white transition-colors duration-200 hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Ukládám…" : "Uložit dokument"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={runSimulatedSharepointSync}
              className="rounded-full border border-apple-border-default px-5 py-2.5 text-body font-medium text-apple-text-primary hover:bg-apple-bg-page disabled:opacity-50"
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
          {initialLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-apple-bg-page" />
              ))}
            </div>
          ) : (
          <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="text-footnote font-semibold uppercase tracking-widest text-apple-text-tertiary">Dokumenty</p>
            <span className="rounded-full bg-apple-bg-subtle px-2.5 py-0.5 text-caption font-medium text-apple-text-secondary">
              {documents.length}
            </span>
            {documents.length > 0 ? (
              <div className="ml-auto flex flex-1 flex-wrap items-center gap-2 sm:flex-initial">
                <input
                  type="search"
                  placeholder="Hledat…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-w-[120px] max-w-[180px] rounded-lg border border-apple-border-default bg-white px-3 py-1.5 text-caption placeholder:text-apple-text-muted focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-500/30 focus:ring-offset-2 sm:w-auto"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-apple-border-default bg-white px-3 py-1.5 text-caption focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-500/30 focus:ring-offset-2"
                >
                  <option value="">Všechny kategorie</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <div className="divide-y divide-apple-bg-subtle">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-apple-text-primary">
                    {doc.source === "url" && doc.source_url ? (
                      <a href={doc.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 hover:underline">
                        {doc.title}
                      </a>
                    ) : (
                      doc.title
                    )}
                  </p>
                  <p className="mt-0.5 text-caption text-apple-text-tertiary">
                    {doc.category ? `${doc.category} · ` : ""}{doc.source}
                    {doc.source === "url" && doc.source_url ? (
                      <a href={doc.source_url} target="_blank" rel="noopener noreferrer" className="ml-1 text-brand-600 hover:underline">
                        ↗
                      </a>
                    ) : null}
                    {" · "}{new Date(doc.created_at).toLocaleDateString("cs-CZ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {doc.source === "url" && doc.source_url ? (
                    <button
                      onClick={() => refreshDocument(doc.id)}
                      disabled={refreshingDocId === doc.id}
                      title="Obnovit z URL"
                      aria-label={`Obnovit dokument ${doc.title} z URL`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-apple-border-default transition-colors hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
                    >
                      {refreshingDocId === doc.id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M15.312 4.437A7.5 7.5 0 011.875 10.5 7.5 7.5 0 0115.312 4.437 1.25 1.25 0 0117.25 5.25v3.375a1.25 1.25 0 01-2.5 0V5.25a1.25 1.25 0 01.562-1.063zM2.5 10.5a5.625 5.625 0 0111.25 0 5.625 5.625 0 01-5.625 5.625.75.75 0 010-1.5 4.125 4.125 0 004.125-4.125 4.125 4.125 0 00-4.125-4.125.75.75 0 010-1.5 5.625 5.625 0 015.625 5.625z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ) : null}
                  <button
                    onClick={() => setConfirmDocId(doc.id)}
                    title="Smazat dokument"
                    aria-label={`Smazat dokument ${doc.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-apple-border-default transition-colors hover:bg-red-50 hover:text-[#ff3b30] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {documents.length === 0 ? (
              <div className="rounded-xl border border-apple-border-light bg-apple-bg-subtle p-6">
                <p className="text-headline font-semibold text-apple-text-primary">Přidejte první dokument</p>
                <p className="mt-1 text-caption text-apple-text-secondary">
                  Znalostní báze zlepšuje výstupy AI. Nahrajte soubory, URL nebo vložte text výše.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: "📄", title: "Soubor", desc: "PDF, DOCX, TXT, MD" },
                    { icon: "🔗", title: "URL", desc: "Stáhne a extrahuje text" },
                    { icon: "✏️", title: "Text", desc: "Vložte obsah přímo" },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="flex items-center gap-3 rounded-lg border border-apple-border-light bg-white p-3">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <p className="text-caption font-medium text-apple-text-primary">{title}</p>
                        <p className="text-footnote text-apple-text-tertiary">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => document.getElementById("kb-upload-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="mt-4 rounded-full bg-brand-600 px-5 py-2 text-caption font-medium text-white transition-colors duration-200 hover:bg-brand-700 active:scale-[0.98]"
                >
                  Nahrajte dokument výše ↑
                </button>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-body text-apple-text-secondary">Žádný dokument neodpovídá filtru.</p>
              </div>
            ) : null}
          </div>
          </>
          )}
        </section>

        {/* Sync log */}
        <section className="rounded-apple bg-white p-6 shadow-apple">
          <p className="mb-4 text-footnote font-semibold uppercase tracking-widest text-apple-text-tertiary">Sync log</p>
          <div className="divide-y divide-apple-bg-subtle">
            {logs.map((log) => (
              <div key={log.id} className="py-3">
                <p className="text-body font-medium text-apple-text-primary">{log.status}</p>
                <p className="mt-0.5 font-mono text-caption text-apple-text-secondary">
                  {log.source_path} · změny: {log.changes_detected}
                </p>
              </div>
            ))}
            {logs.length === 0 ? (
              <p className="py-4 text-body text-apple-text-muted">Žádné synchronizace.</p>
            ) : null}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDocId !== null}
        title="Smazat dokument?"
        message={
          confirmDocId
            ? `Dokument „${documents.find((d) => d.id === confirmDocId)?.title ?? ""}“ bude trvale smazán.`
            : ""
        }
        confirmLabel="Smazat"
        onConfirm={() => confirmDocId && deleteDocument(confirmDocId)}
        onCancel={() => setConfirmDocId(null)}
        loading={deletingDocId !== null}
      />
    </main>
  );
}

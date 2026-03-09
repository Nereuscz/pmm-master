"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AiOutput from "@/components/AiOutput";
import Breadcrumbs from "@/components/Breadcrumbs";
import { PHASE_COLORS } from "@/lib/constants";
import { JIC_CUSTOM_FIELDS } from "@/lib/jic-custom-fields";
import ErrorMessage from "@/components/ErrorMessage";
import { SkeletonDetail } from "@/components/LoadingState";
import { sanitizeFilename } from "@/lib/filename";

type Project = {
  id: string;
  name: string;
  framework: string;
  phase: string;
  created_at: string;
  asana_project_id?: string | null;
  description?: string | null;
  asana_metadata?: Record<string, string> | null;
};

type Session = { id: string; phase: string; ai_output: string; created_at: string };
type KbDoc = { id: string; title: string; category: string; created_at: string; visibility: string; project_id: string | null };
type ContextData = {
  accumulated_context: string;
  last_updated: string | null;
  annotations: string | null;
  annotations_updated: string | null;
};

/** Odstraní markdown symboly a vrátí max ~180 znaků čistého textu jako preview. */
function getPreview(text: string): string {
  const stripped = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^[-*•]\s+/gm, "")
    .replace(/`[^`]+`/g, "")
    .replace(/\n+/g, " ")
    .trim();
  if (stripped.length <= 180) return stripped;
  const cut = stripped.slice(0, 180).replace(/\s+\S*$/, "");
  return cut + "…";
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [context, setContext] = useState<ContextData | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [annotationsEditing, setAnnotationsEditing] = useState(false);
  const [annotationsEditValue, setAnnotationsEditValue] = useState("");
  const [annotationsRegenerating, setAnnotationsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [asanaProjectIdInput, setAsanaProjectIdInput] = useState("");
  const [asanaLinkSaving, setAsanaLinkSaving] = useState(false);
  const [metadataEditing, setMetadataEditing] = useState(false);
  const [metadataEditValues, setMetadataEditValues] = useState<Record<string, string>>({});
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [projectKbDocs, setProjectKbDocs] = useState<KbDoc[]>([]);
  const [kbUploading, setKbUploading] = useState(false);
  const [kbDeletingId, setKbDeletingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${params.id}`).then((r) => r.json()),
      fetch(`/api/projects/${params.id}/sessions`).then((r) => r.json()),
      fetch(`/api/projects/${params.id}/context`).then((r) => r.json()),
      fetch(`/api/kb/documents?projectId=${params.id}`).then((r) => r.json())
    ])
      .then(([projectJson, sessionsJson, contextJson, kbJson]) => {
        if (projectJson.error) throw new Error(projectJson.error);
        setProject(projectJson.project);
        setSessions(sessionsJson.sessions ?? []);
        setContext(contextJson.context ?? null);
        if (sessionsJson.sessions?.[0]) setExpandedSession(sessionsJson.sessions[0].id);
        setProjectKbDocs(
          (kbJson.documents ?? []).filter(
            (d: KbDoc) => d.visibility === "project" && d.project_id === params.id
          )
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Chyba načítání"))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function uploadKbFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setKbUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("title", file.name.replace(/\.[^.]+$/, ""));
      formData.set("category", "Projektová KB");
      formData.set("visibility", "project");
      formData.set("projectId", params.id);
      const r = await fetch("/api/kb/upload", { method: "POST", body: formData });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Upload selhal");
      const docsRes = await fetch(`/api/kb/documents?projectId=${params.id}`);
      const docsJson = await docsRes.json();
      setProjectKbDocs(
        (docsJson.documents ?? []).filter(
          (d: KbDoc) => d.visibility === "project" && d.project_id === params.id
        )
      );
      toast.success("Dokument nahrán do projektové KB.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chyba uploadu");
    } finally {
      setKbUploading(false);
      e.target.value = "";
    }
  }

  async function deleteKbDoc(id: string) {
    setKbDeletingId(id);
    try {
      const r = await fetch(`/api/kb/documents/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const json = await r.json();
        throw new Error(json.error || "Smazání selhalo");
      }
      setProjectKbDocs((prev) => prev.filter((d) => d.id !== id));
      toast.success("Dokument smazán.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chyba");
    } finally {
      setKbDeletingId(null);
    }
  }

  if (loading) return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <SkeletonDetail />
    </main>
  );
  if (error) return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <ErrorMessage message={error} />
    </main>
  );
  if (!project) return null;

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <Breadcrumbs items={[{ label: "Projekty", href: "/dashboard" }, { label: project.name }]} />

      {/* Header karta */}
      <div className="mb-6 rounded-apple bg-white p-6 shadow-apple">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-title font-semibold tracking-tight text-apple-text-primary">{project.name}</h1>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="text-body text-apple-text-secondary">{project.framework}</span>
              <span className="text-apple-border-default">·</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  PHASE_COLORS[project.phase] ?? "bg-apple-bg-subtle text-apple-text-secondary"
                }`}
              >
                {project.phase}
              </span>
              <span className="text-apple-border-default">·</span>
              <span className="text-caption text-apple-text-muted">
                {new Date(project.created_at).toLocaleDateString("cs-CZ")}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/guide?projectId=${project.id}`}
              className="rounded-full border border-apple-border-default bg-white px-4 py-2 text-body font-medium text-apple-text-primary transition-colors hover:bg-apple-bg-page"
            >
              💬 Průvodce
            </Link>
            <Link
              href={`/process?projectId=${project.id}`}
              className="rounded-full bg-brand-600 px-4 py-2 text-body font-medium text-white transition-colors hover:bg-brand-700"
            >
              + Zpracovat transkript
            </Link>
          </div>
        </div>
      </div>

      {/* Popis a metadata z Asany */}
      <section className="mb-6 rounded-apple bg-white p-6 shadow-apple">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-apple-text-tertiary">
            Metadata z Asany
          </h2>
          <button
            type="button"
            onClick={() => {
              if (!metadataEditing) {
                const base: Record<string, string> = { ...(project.asana_metadata ?? {}) };
                for (const f of JIC_CUSTOM_FIELDS) {
                  if (!(f.name in base)) base[f.name] = "";
                }
                setMetadataEditValues(base);
              }
              setMetadataEditing(!metadataEditing);
            }}
            className="rounded-full border border-apple-border-default px-3 py-1.5 text-[12px] font-medium text-apple-text-primary hover:bg-apple-bg-page"
          >
            {metadataEditing ? "Zrušit" : "Upravit přiřazení"}
          </button>
        </div>
        {metadataEditing ? (
          <div className="mt-4 space-y-4">
            {JIC_CUSTOM_FIELDS.map((field) => (
              <div key={field.id}>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-apple-text-tertiary">
                  {field.name}
                </label>
                {field.type === "single" ? (
                  <select
                    value={metadataEditValues[field.name] ?? ""}
                    onChange={(e) =>
                      setMetadataEditValues((prev) => ({
                        ...prev,
                        [field.name]: e.target.value,
                      }))
                    }
                    className="w-full max-w-md rounded-xl border border-apple-border-default bg-white px-4 py-2 text-body text-apple-text-primary focus:border-brand-600 focus:outline-none"
                  >
                    <option value="">— nevybráno —</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex max-w-md flex-wrap gap-2">
                    {field.options.map((opt) => {
                      const current = (metadataEditValues[field.name] ?? "").split(", ").filter(Boolean);
                      const checked = current.includes(opt);
                      return (
                        <label
                          key={opt}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-apple-border-default bg-white px-3 py-2 text-caption has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...current, opt]
                                : current.filter((v) => v !== opt);
                              setMetadataEditValues((prev) => ({
                                ...prev,
                                [field.name]: next.join(", "),
                              }));
                            }}
                            className="h-4 w-4 rounded border-apple-border-default text-brand-600"
                          />
                          <span className="text-apple-text-primary">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              disabled={metadataSaving}
              onClick={async () => {
                setMetadataSaving(true);
                try {
                  const r = await fetch(`/api/projects/${params.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      asana_metadata: (() => {
                        const merged = { ...project.asana_metadata, ...metadataEditValues };
                        return Object.fromEntries(
                          Object.entries(merged).filter(([, v]) => v != null && v !== "")
                        );
                      })(),
                    }),
                  });
                  if (!r.ok) {
                    const json = await r.json();
                    throw new Error(json.error || "Uložení selhalo");
                  }
                  const json = await r.json();
                  setProject((p) => (p ? { ...p, asana_metadata: json.project?.asana_metadata ?? metadataEditValues } : null));
                  setMetadataEditing(false);
                  toast.success("Metadata uložena.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Chyba");
                } finally {
                  setMetadataSaving(false);
                }
              }}
              className="rounded-full bg-brand-600 px-5 py-2 text-body font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {metadataSaving ? "Ukládám…" : "Uložit"}
            </button>
            {project.description ? (
              <div className="mt-6">
                <h3 className="text-caption font-semibold text-apple-text-secondary">Popis</h3>
                <p className="mt-1 whitespace-pre-wrap text-body text-apple-text-primary">
                  {project.description}
                </p>
              </div>
            ) : null}
          </div>
        ) : project.asana_metadata && Object.keys(project.asana_metadata).length > 0 ? (
          <div className="mt-4 space-y-6">
            <div>
              <h3 className="text-caption font-semibold text-apple-text-secondary">Custom fieldy</h3>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                {(() => {
                  const entries = Object.entries(project.asana_metadata);
                  const jicOrder = JIC_CUSTOM_FIELDS.map((f) => f.name);
                  const sorted = [...entries].sort(([a], [b]) => {
                    const ai = jicOrder.indexOf(a);
                    const bi = jicOrder.indexOf(b);
                    if (ai >= 0 && bi >= 0) return ai - bi;
                    if (ai >= 0) return -1;
                    if (bi >= 0) return 1;
                    return a.localeCompare(b);
                  });
                  return sorted;
                })().map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-0.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-apple-text-tertiary">
                      {key}
                    </dt>
                    <dd className="text-body text-apple-text-primary">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {project.description ? (
              <div>
                <h3 className="text-caption font-semibold text-apple-text-secondary">Popis</h3>
                <p className="mt-1 whitespace-pre-wrap text-body text-apple-text-primary">
                  {project.description}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            <p className="text-caption text-apple-text-tertiary">
              Žádná metadata. Klikni „Upravit přiřazení“ pro přiřazení hodnot.
            </p>
            {project.description ? (
              <div>
                <h3 className="text-caption font-semibold text-apple-text-secondary">Popis</h3>
                <p className="mt-1 whitespace-pre-wrap text-body text-apple-text-primary">
                  {project.description}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Propojení s Asanou */}
      <section className="mb-6 rounded-apple bg-white p-6 shadow-apple">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-apple-text-tertiary">
          Propojení s Asanou
        </h2>
        <p className="mt-2 text-[14px] text-apple-text-secondary">
          Pro export úkolů do Asany propoj tento projekt s projektem v Asaně. Asana project ID (GID) najdeš v URL projektu v Asaně – např.{" "}
          <code className="rounded bg-apple-bg-subtle px-1.5 py-0.5 text-[12px]">app.asana.com/0/0/<strong>123456789</strong></code>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {project.asana_project_id ? (
            <>
              <span className="text-[14px] font-medium text-[#34c759]">
                Propojeno: {project.asana_project_id}
              </span>
              <button
                type="button"
                disabled={asanaLinkSaving}
                onClick={async () => {
                  setAsanaLinkSaving(true);
                  try {
                    const r = await fetch(`/api/projects/${params.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ asana_project_id: null }),
                    });
                    const json = await r.json();
                    if (!r.ok) throw new Error(json.error || "Odpojení selhalo.");
                    setProject((p) => p ? { ...p, asana_project_id: null } : null);
                    toast.success("Projekt odpojen od Asany.");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Chyba");
                  } finally {
                    setAsanaLinkSaving(false);
                  }
                }}
                className="rounded-full border border-apple-border-default px-4 py-2 text-[14px] font-medium text-apple-text-primary hover:bg-apple-bg-page disabled:opacity-50"
              >
                Odpojit
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={asanaProjectIdInput}
                onChange={(e) => setAsanaProjectIdInput(e.target.value)}
                placeholder="1234567890123456"
                className="w-64 rounded-xl border border-apple-border-default px-4 py-2 text-[14px] placeholder:text-apple-text-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
              <button
                type="button"
                disabled={asanaLinkSaving || !asanaProjectIdInput.trim()}
                onClick={async () => {
                  const gid = asanaProjectIdInput.trim();
                  if (!gid) return;
                  setAsanaLinkSaving(true);
                  try {
                    const r = await fetch(`/api/projects/${params.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ asana_project_id: gid }),
                    });
                    const json = await r.json();
                    if (!r.ok) throw new Error(json.error || "Propojení selhalo.");
                    setProject((p) => p ? { ...p, asana_project_id: gid } : null);
                    setAsanaProjectIdInput("");
                    toast.success("Projekt propojen s Asanou.");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Chyba");
                  } finally {
                    setAsanaLinkSaving(false);
                  }
                }}
                className="rounded-full bg-brand-600 px-5 py-2 text-[14px] font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {asanaLinkSaving ? "Ukládám…" : "Propojit"}
              </button>
            </>
          )}
        </div>
      </section>

      {/* Anotace projektu */}
      {context?.accumulated_context ? (
        <section className="mb-6 overflow-hidden rounded-apple bg-white shadow-apple">
          <button
            onClick={() => setContextExpanded(!contextExpanded)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[#fafafa]"
          >
            <div className="flex items-center gap-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-apple-text-tertiary">
                Anotace projektu
              </p>
              {context.annotations_updated ? (
                <span className="text-[11px] text-apple-text-muted">
                  · aktualizováno {new Date(context.annotations_updated).toLocaleDateString("cs-CZ")}
                </span>
              ) : null}
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-apple-text-muted transition-transform ${contextExpanded ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {contextExpanded ? (
            <div className="border-t border-[#f2f2f7] px-6 py-5">
              {context.annotations ? (
                <>
                  {annotationsEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={annotationsEditValue}
                        onChange={(e) => setAnnotationsEditValue(e.target.value)}
                        rows={6}
                        className="w-full resize-y rounded-xl border border-apple-border-default px-4 py-3 text-[14px] leading-relaxed focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                        placeholder="Anotace projektu…"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const r = await fetch(`/api/projects/${params.id}/context/annotations`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ annotations: annotationsEditValue })
                              });
                              const json = await r.json();
                              if (!r.ok) throw new Error(json.error || "Chyba ukládání");
                              setContext((c) => c ? { ...c, annotations: annotationsEditValue, annotations_updated: json.annotations_updated } : null);
                              setAnnotationsEditing(false);
                              toast.success("Anotace uloženy.");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Chyba");
                            }
                          }}
                          className="rounded-full bg-brand-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-brand-700"
                        >
                          Uložit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAnnotationsEditValue(context.annotations ?? "");
                            setAnnotationsEditing(false);
                          }}
                          className="rounded-full border border-apple-border-default px-4 py-2 text-[13px] font-medium text-apple-text-primary hover:bg-apple-bg-page"
                        >
                          Zrušit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#3a3a3a]">
                        {context.annotations}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAnnotationsEditValue(context.annotations ?? "");
                            setAnnotationsEditing(true);
                          }}
                          className="rounded-full border border-apple-border-default px-4 py-2 text-[13px] font-medium text-apple-text-primary hover:bg-apple-bg-page"
                        >
                          Upravit
                        </button>
                        <button
                          type="button"
                          disabled={annotationsRegenerating}
                          onClick={async () => {
                            setAnnotationsRegenerating(true);
                            try {
                              const r = await fetch(`/api/projects/${params.id}/context/annotations`, {
                                method: "POST"
                              });
                              const json = await r.json();
                              if (!r.ok) throw new Error(json.error || "Chyba generování");
                              setContext((c) => c ? { ...c, annotations: json.annotations, annotations_updated: json.annotations_updated } : null);
                              toast.success("Anotace přegenerovány.");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Chyba");
                            } finally {
                              setAnnotationsRegenerating(false);
                            }
                          }}
                          className="rounded-full bg-brand-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                          {annotationsRegenerating ? "Generuji…" : "Regenerovat"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-[14px] text-apple-text-secondary">
                    Anotace zatím nebyly vygenerovány. Klikni na tlačítko pro vytvoření souhrnu projektu z nahraného kontextu.
                  </p>
                  <button
                    type="button"
                    disabled={annotationsRegenerating}
                    onClick={async () => {
                      setAnnotationsRegenerating(true);
                      try {
                        const r = await fetch(`/api/projects/${params.id}/context/annotations`, {
                          method: "POST"
                        });
                        const json = await r.json();
                        if (!r.ok) throw new Error(json.error || "Chyba generování");
                        setContext((c) => c ? { ...c, annotations: json.annotations, annotations_updated: json.annotations_updated } : null);
                        toast.success("Anotace vygenerovány.");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Chyba");
                      } finally {
                        setAnnotationsRegenerating(false);
                      }
                    }}
                    className="rounded-full bg-brand-600 px-5 py-2.5 text-[14px] font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {annotationsRegenerating ? "Generuji…" : "Vygenerovat anotace"}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Projektová KB */}
      <section className="mb-6 rounded-apple bg-white p-6 shadow-apple">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-apple-text-tertiary">
              Projektová znalostní báze
            </h2>
            {projectKbDocs.length > 0 && (
              <span className="rounded-full bg-apple-bg-subtle px-2 py-0.5 text-[11px] font-medium text-apple-text-secondary">
                {projectKbDocs.length}
              </span>
            )}
          </div>
          <label className={`cursor-pointer rounded-full bg-brand-600 px-4 py-2 text-caption font-medium text-white transition-colors hover:bg-brand-700 ${kbUploading ? "opacity-50 pointer-events-none" : ""}`}>
            {kbUploading ? "Nahrávám…" : "+ Přidat dokument"}
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              onChange={uploadKbFile}
              className="sr-only"
            />
          </label>
        </div>
        <p className="mt-1.5 text-caption text-apple-text-tertiary">
          Dokumenty specifické pro tento projekt – AI je použije jako dodatečný kontext při zpracování a průvodci.
        </p>
        {projectKbDocs.length === 0 ? (
          <p className="mt-4 text-caption text-apple-text-muted">Zatím žádné dokumenty. Nahraj PDF, DOCX, TXT nebo MD.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {projectKbDocs.map((doc) => (
              <li key={doc.id} className="group flex items-center justify-between rounded-xl border border-apple-border-light bg-apple-bg-subtle px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-caption font-medium text-apple-text-primary">{doc.title}</p>
                  <p className="mt-0.5 text-footnote text-apple-text-tertiary">
                    {new Date(doc.created_at).toLocaleDateString("cs-CZ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteKbDoc(doc.id)}
                  disabled={kbDeletingId === doc.id}
                  aria-label={`Smazat ${doc.title}`}
                  className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-apple-text-muted opacity-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500 focus:opacity-100 focus:outline-none group-hover:opacity-100 disabled:opacity-40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Historie zpracování */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-apple-text-tertiary">
            Historie zpracování
          </p>
          <span className="rounded-full bg-apple-bg-subtle px-2.5 py-0.5 text-[12px] font-medium text-apple-text-secondary">
            {sessions.length}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-apple bg-white py-16 text-center shadow-apple">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-apple-bg-subtle">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-apple-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-apple-text-primary">Zatím žádné zpracované transkripty</p>
            <Link
              href={`/process?projectId=${project.id}`}
              className="mt-4 inline-block text-[14px] font-medium text-brand-600 hover:text-brand-700"
            >
              Zpracovat první transkript →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isOpen = expandedSession === session.id;
              return (
                <div key={session.id} className="overflow-hidden rounded-apple bg-white shadow-apple">
                  {/* Hlavička řádku */}
                  <button
                    onClick={() => setExpandedSession(isOpen ? null : session.id)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[#fafafa]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          PHASE_COLORS[session.phase] ?? "bg-apple-bg-subtle text-apple-text-secondary"
                        }`}
                      >
                        {session.phase}
                      </span>
                      <span className="text-[14px] text-apple-text-secondary">
                        {new Date(session.created_at).toLocaleString("cs-CZ")}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!isOpen && (
                        <span className="text-[12px] font-medium text-brand-600">▶ Rozbalit</span>
                      )}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 text-apple-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Preview 2 řádky – pouze kdy je složeno */}
                  {!isOpen && session.ai_output ? (
                    <p className="line-clamp-2 border-t border-[#f2f2f7] px-6 pb-4 pt-2 text-[13px] leading-relaxed text-apple-text-secondary">
                      {getPreview(session.ai_output)}
                    </p>
                  ) : null}

                  {/* Plný výstup – pouze kdy je rozbaleno */}
                  {isOpen ? (
                    <div className="border-t border-[#f2f2f7] p-6">
                      <AiOutput
                        content={session.ai_output}
                        downloadFilename={`pm-vystup-${sanitizeFilename(project.name)}`}
                        sessionId={session.id}
                        onContentSaved={(newContent) =>
                          setSessions((prev) =>
                            prev.map((s) => (s.id === session.id ? { ...s, ai_output: newContent } : s))
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AiOutput from "@/components/AiOutput";
import Breadcrumbs from "@/components/Breadcrumbs";
import MarkdownContent from "@/components/MarkdownContent";
import { PHASE_COLORS } from "@/lib/constants";
import ErrorMessage from "@/components/ErrorMessage";
import { SkeletonDetail } from "@/components/LoadingState";

type Project = { id: string; name: string; framework: string; phase: string; created_at: string; asana_project_id?: string | null };

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
type Session = { id: string; phase: string; ai_output: string; created_at: string };
type ContextData = { accumulated_context: string; last_updated: string | null };

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
  const [memorySummary, setMemorySummary] = useState<string | null>(null);
  const [memorySummaryLoading, setMemorySummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [asanaProjectIdInput, setAsanaProjectIdInput] = useState("");
  const [asanaLinkSaving, setAsanaLinkSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${params.id}`).then((r) => r.json()),
      fetch(`/api/projects/${params.id}/sessions`).then((r) => r.json()),
      fetch(`/api/projects/${params.id}/context`).then((r) => r.json())
    ])
      .then(([projectJson, sessionsJson, contextJson]) => {
        if (projectJson.error) throw new Error(projectJson.error);
        setProject(projectJson.project);
        setSessions(sessionsJson.sessions ?? []);
        setContext(contextJson.context ?? null);
        if (sessionsJson.sessions?.[0]) setExpandedSession(sessionsJson.sessions[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Chyba načítání"))
      .finally(() => setLoading(false));
  }, [params.id]);

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
            <h1 className="text-[24px] font-semibold tracking-tight text-[#1d1d1f]">{project.name}</h1>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="text-[14px] text-[#6e6e73]">{project.framework}</span>
              <span className="text-[#d2d2d7]">·</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  PHASE_COLORS[project.phase] ?? "bg-[#f2f2f7] text-[#6e6e73]"
                }`}
              >
                {project.phase}
              </span>
              <span className="text-[#d2d2d7]">·</span>
              <span className="text-[13px] text-[#aeaeb2]">
                {new Date(project.created_at).toLocaleDateString("cs-CZ")}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/guide?projectId=${project.id}`}
              className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-[14px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
            >
              💬 Průvodce
            </Link>
            <Link
              href={`/process?projectId=${project.id}`}
              className="rounded-full bg-brand-600 px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-700"
            >
              + Zpracovat transkript
            </Link>
          </div>
        </div>
      </div>

      {/* Propojení s Asanou */}
      <section className="mb-6 rounded-apple bg-white p-6 shadow-apple">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#86868b]">
          Propojení s Asanou
        </h2>
        <p className="mt-2 text-[14px] text-[#6e6e73]">
          Pro export úkolů do Asany propoj tento projekt s projektem v Asaně. Asana project ID (GID) najdeš v URL projektu v Asaně – např.{" "}
          <code className="rounded bg-[#f2f2f7] px-1.5 py-0.5 text-[12px]">app.asana.com/0/0/<strong>123456789</strong></code>
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
                className="rounded-full border border-[#d2d2d7] px-4 py-2 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50"
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
                className="w-64 rounded-xl border border-[#d2d2d7] px-4 py-2 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
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

      {/* Paměť projektu */}
      {context?.accumulated_context ? (
        <section className="mb-6 overflow-hidden rounded-apple bg-white shadow-apple">
          <button
            onClick={() => {
              const next = !contextExpanded;
              setContextExpanded(next);
              // Lazy-load AI shrnutí při prvním rozbalení
              if (next && memorySummary === null && !memorySummaryLoading) {
                setMemorySummaryLoading(true);
                fetch(`/api/projects/${params.id}/context/summary`)
                  .then((r) => r.json())
                  .then((json) => setMemorySummary(json.summary ?? null))
                  .catch(() => setMemorySummary(null))
                  .finally(() => setMemorySummaryLoading(false));
              }
            }}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[#fafafa]"
          >
            <div className="flex items-center gap-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#86868b]">
                Paměť projektu
              </p>
              {context.last_updated ? (
                <span className="text-[11px] text-[#aeaeb2]">
                  · aktualizováno {new Date(context.last_updated).toLocaleDateString("cs-CZ")}
                </span>
              ) : null}
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-[#aeaeb2] transition-transform ${contextExpanded ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {contextExpanded ? (
            <div className="border-t border-[#f2f2f7] px-6 py-5">
              {memorySummaryLoading ? (
                <div className="flex items-center gap-2 text-[13px] text-[#aeaeb2]">
                  <span className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#d2d2d7]"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                  AI generuje shrnutí…
                </div>
              ) : memorySummary ? (
                <p className="text-[14px] leading-relaxed text-[#3a3a3a]">{memorySummary}</p>
              ) : (
                <MarkdownContent content={context.accumulated_context} />
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Historie zpracování */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#86868b]">
            Historie zpracování
          </p>
          <span className="rounded-full bg-[#f2f2f7] px-2.5 py-0.5 text-[12px] font-medium text-[#6e6e73]">
            {sessions.length}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-apple bg-white py-16 text-center shadow-apple">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f2f7]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#aeaeb2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-[#1d1d1f]">Zatím žádné zpracované transkripty</p>
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
                          PHASE_COLORS[session.phase] ?? "bg-[#f2f2f7] text-[#6e6e73]"
                        }`}
                      >
                        {session.phase}
                      </span>
                      <span className="text-[14px] text-[#6e6e73]">
                        {new Date(session.created_at).toLocaleString("cs-CZ")}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!isOpen && (
                        <span className="text-[12px] font-medium text-brand-600">▶ Rozbalit</span>
                      )}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 text-[#aeaeb2] transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Preview 2 řádky – pouze kdy je složeno */}
                  {!isOpen && session.ai_output ? (
                    <p className="line-clamp-2 border-t border-[#f2f2f7] px-6 pb-4 pt-2 text-[13px] leading-relaxed text-[#6e6e73]">
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AiOutput from "@/components/AiOutput";
import MarkdownContent from "@/components/MarkdownContent";

type Project = { id: string; name: string; framework: string; phase: string; created_at: string };
type Session = { id: string; phase: string; ai_output: string; created_at: string };
type ContextData = { accumulated_context: string; last_updated: string | null };

const PHASE_COLORS: Record<string, string> = {
  Iniciace:  "bg-blue-100 text-blue-700",
  Plánování: "bg-violet-100 text-violet-700",
  Realizace: "bg-amber-100 text-amber-700",
  Closing:   "bg-[#d1f5d3] text-[#1a7f37]",
  "Gate 1":  "bg-[#f2f2f7] text-[#6e6e73]",
  "Gate 2":  "bg-[#f2f2f7] text-[#6e6e73]",
  "Gate 3":  "bg-[#f2f2f7] text-[#6e6e73]",
};

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
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded-lg bg-white shadow-apple-sm" />
        <div className="h-32 animate-pulse rounded-apple bg-white shadow-apple" />
        <div className="h-48 animate-pulse rounded-apple bg-white shadow-apple" />
      </div>
    </main>
  );
  if (error) return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <div className="rounded-apple bg-[#fff2f2] p-6 text-[#c0392b]">{error}</div>
    </main>
  );
  if (!project) return null;

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/dashboard" className="text-[14px] text-brand-600 hover:text-brand-700">
          ← Projekty
        </Link>
      </div>

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
            <p className="text-[15px] font-medium text-[#1d1d1f]">Zatím žádná zpracování</p>
            <Link
              href={`/process?projectId=${project.id}`}
              className="mt-4 inline-block text-[14px] font-medium text-brand-600 hover:text-brand-700"
            >
              Zpracovat první transkript →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="overflow-hidden rounded-apple bg-white shadow-apple">
                <button
                  onClick={() =>
                    setExpandedSession(expandedSession === session.id ? null : session.id)
                  }
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-[#aeaeb2] transition-transform ${expandedSession === session.id ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSession === session.id ? (
                  <div className="border-t border-[#f2f2f7] p-6">
                    <AiOutput content={session.ai_output} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

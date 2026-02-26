"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AiOutput from "@/components/AiOutput";

type Project = { id: string; name: string; framework: string; phase: string; created_at: string };
type Session = { id: string; phase: string; ai_output: string; created_at: string };
type ContextData = { accumulated_context: string; last_updated: string | null };

const PHASE_COLORS: Record<string, string> = {
  Iniciace: "bg-blue-100 text-blue-700",
  Plánování: "bg-violet-100 text-violet-700",
  Realizace: "bg-amber-100 text-amber-700",
  Closing: "bg-green-100 text-green-700"
};

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [context, setContext] = useState<ContextData | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
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

  if (loading) return <main className="mx-auto max-w-5xl px-6 py-10 text-slate-500">Načítám...</main>;
  if (error) return <main className="mx-auto max-w-5xl px-6 py-10 text-red-600">{error}</main>;
  if (!project) return null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
          ← Projekty
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <span>{project.framework}</span>
              <span>·</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  PHASE_COLORS[project.phase] ?? "bg-slate-100 text-slate-700"
                }`}
              >
                {project.phase}
              </span>
            </div>
          </div>
          <Link
            href={`/process?projectId=${project.id}`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Zpracovat transkript
          </Link>
        </div>
      </div>

      {/* Paměť projektu */}
      {context?.accumulated_context ? (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Paměť projektu
          </h2>
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {context.accumulated_context}
          </p>
        </section>
      ) : null}

      {/* Historie zpracování */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Historie zpracování ({sessions.length})
        </h2>
        {sessions.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white py-12 text-center">
            <p className="text-slate-500">Zatím žádná zpracování.</p>
            <Link
              href={`/process?projectId=${project.id}`}
              className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
            >
              Zpracovat první transkript →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  onClick={() =>
                    setExpandedSession(expandedSession === session.id ? null : session.id)
                  }
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        PHASE_COLORS[session.phase] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {session.phase}
                    </span>
                    <span className="text-sm text-slate-600">
                      {new Date(session.created_at).toLocaleString("cs-CZ")}
                    </span>
                  </div>
                  <span className="text-slate-400">{expandedSession === session.id ? "▲" : "▼"}</span>
                </button>
                {expandedSession === session.id ? (
                  <div className="border-t border-slate-100 p-5">
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

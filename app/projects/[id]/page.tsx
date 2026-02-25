"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  framework: string;
  phase: string;
  created_at: string;
};

type Session = {
  id: string;
  phase: string;
  ai_output: string;
  created_at: string;
};

type ContextData = {
  project_id: string;
  accumulated_context: string;
  last_updated: string | null;
};

type Job = {
  id: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [context, setContext] = useState<ContextData | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [projectRes, sessionsRes, contextRes, jobsRes] = await Promise.all([
        fetch(`/api/projects/${params.id}`),
        fetch(`/api/projects/${params.id}/sessions`),
        fetch(`/api/projects/${params.id}/context`),
        fetch(`/api/projects/${params.id}/jobs`)
      ]);
      const [projectJson, sessionsJson, contextJson, jobsJson] = await Promise.all([
        projectRes.json(),
        sessionsRes.json(),
        contextRes.json(),
        jobsRes.json()
      ]);

      if (!projectRes.ok) {
        setError(projectJson.error || "Nepodařilo se načíst projekt.");
        return;
      }
      setProject(projectJson.project);
      setSessions(sessionsJson.sessions ?? []);
      setContext(contextJson.context ?? null);
      setJobs(jobsJson.jobs ?? []);
    }
    load().catch((e) => setError(e instanceof Error ? e.message : "Unknown error"));
  }, [params.id]);

  if (error) {
    return <main className="mx-auto max-w-5xl px-6 py-10 text-red-700">{error}</main>;
  }

  if (!project) {
    return <main className="mx-auto max-w-5xl px-6 py-10 text-slate-600">Načítám projekt...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-slate-600">
          Framework: {project.framework} | Fáze: {project.phase}
        </p>
        <div className="mt-3 flex gap-3">
          <Link
            href={`/process?projectId=${project.id}`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Nové zpracování
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            Zpět na dashboard
          </Link>
        </div>
      </header>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Paměť projektu</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
          {context?.accumulated_context || "Zatím prázdné."}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Historie zpracování</h2>
        <div className="mt-4 space-y-4">
          {sessions.map((session) => (
            <article key={session.id} className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600">
                {session.phase} | {new Date(session.created_at).toLocaleString("cs-CZ")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                {session.ai_output.slice(0, 1200)}
                {session.ai_output.length > 1200 ? "..." : ""}
              </p>
            </article>
          ))}
          {sessions.length === 0 ? (
            <p className="text-sm text-slate-600">Zatím žádná zpracování.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Processing jobs</h2>
        <div className="mt-4 space-y-3">
          {jobs.map((job) => (
            <article key={job.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium">
                {job.status} | {new Date(job.created_at).toLocaleString("cs-CZ")}
              </p>
              {job.error_message ? <p className="text-red-700">{job.error_message}</p> : null}
            </article>
          ))}
          {jobs.length === 0 ? <p className="text-sm text-slate-600">Žádné joby.</p> : null}
        </div>
      </section>
    </main>
  );
}

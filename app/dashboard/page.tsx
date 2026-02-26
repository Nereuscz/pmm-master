"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  phase: string;
  framework: string;
  created_at: string;
};

const PHASE_COLORS: Record<string, string> = {
  Iniciace: "bg-blue-100 text-blue-700",
  Plánování: "bg-violet-100 text-violet-700",
  Realizace: "bg-amber-100 text-amber-700",
  Closing: "bg-green-100 text-green-700",
  "Gate 1": "bg-slate-100 text-slate-700",
  "Gate 2": "bg-slate-100 text-slate-700",
  "Gate 3": "bg-slate-100 text-slate-700"
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setProjects(json.projects ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Chyba načítání"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projekty</h1>
          <p className="mt-1 text-sm text-slate-500">Přehled všech PM projektů</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nový projekt
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-slate-500">Zatím žádné projekty.</p>
          <Link
            href="/projects/new"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Vytvořit první projekt
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div>
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-semibold text-slate-900 hover:text-brand-700"
                  >
                    {project.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>{project.framework}</span>
                    <span>·</span>
                    <span>{new Date(project.created_at).toLocaleDateString("cs-CZ")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    PHASE_COLORS[project.phase] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {project.phase}
                </span>
                <Link
                  href={`/process?projectId=${project.id}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Zpracovat →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

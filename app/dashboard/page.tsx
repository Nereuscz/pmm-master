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
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function deleteProject(id: string) {
    setDeletingId(id);
    setConfirmId(null);
    try {
      const r = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const json = await r.json();
        throw new Error(json.error || "Smazání selhalo");
      }
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Smazání selhalo");
    } finally {
      setDeletingId(null);
    }
  }

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
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
              className="relative flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:border-brand-300 hover:shadow-md"
            >
              {/* Levá část – název + meta (celá karta je klikatelná přes stretched link) */}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-semibold text-slate-900 after:absolute after:inset-0 after:rounded-xl hover:text-brand-700"
                >
                  {project.name}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span>{project.framework}</span>
                  <span>·</span>
                  <span>{new Date(project.created_at).toLocaleDateString("cs-CZ")}</span>
                </div>
              </div>

              {/* Pravá část – badge + akce (z-10 aby překryly stretched link) */}
              <div className="relative z-10 ml-4 flex shrink-0 items-center gap-2">
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

                {/* Mazání – inline potvrzení */}
                {deletingId === project.id ? (
                  <div className="flex h-7 w-7 items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                  </div>
                ) : confirmId === project.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Smazat?</span>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Ano
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Ne
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(project.id)}
                    title="Smazat projekt"
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
        </div>
      )}
    </main>
  );
}

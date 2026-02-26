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
  Iniciace:  "bg-blue-100 text-blue-700",
  Plánování: "bg-violet-100 text-violet-700",
  Realizace: "bg-amber-100 text-amber-700",
  Closing:   "bg-[#d1f5d3] text-[#1a7f37]",
  "Gate 1":  "bg-[#f2f2f7] text-[#6e6e73]",
  "Gate 2":  "bg-[#f2f2f7] text-[#6e6e73]",
  "Gate 3":  "bg-[#f2f2f7] text-[#6e6e73]",
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
    <main className="mx-auto max-w-5xl px-8 py-10">
      {/* Hlavička */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">Projekty</h1>
          <p className="mt-1 text-[15px] text-[#6e6e73]">Přehled všech PM projektů</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-full bg-brand-600 px-5 py-2 text-[15px] font-medium text-white transition-colors hover:bg-brand-700"
        >
          + Nový projekt
        </Link>
      </div>

      {/* Chyba */}
      {error ? (
        <div className="mb-6 rounded-apple bg-[#fff2f2] p-4 text-sm text-[#c0392b]">
          {error}
        </div>
      ) : null}

      {/* Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-apple bg-white shadow-apple-sm" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        /* Empty state */
        <div className="rounded-apple bg-white py-20 text-center shadow-apple">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <p className="text-[17px] font-medium text-[#1d1d1f]">Zatím žádné projekty</p>
          <p className="mt-1 text-[14px] text-[#6e6e73]">Začni vytvořením svého prvního projektu.</p>
          <Link
            href="/projects/new"
            className="mt-6 inline-block rounded-full bg-brand-600 px-6 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-brand-700"
          >
            Vytvořit první projekt
          </Link>
        </div>
      ) : (
        /* Projekt grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project.id}
              className="group relative flex flex-col rounded-apple bg-white p-6 shadow-apple transition-all hover:-translate-y-0.5 hover:shadow-apple-lg"
            >
              {/* Stretched link – celá karta */}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/projects/${project.id}`}
                  className="text-[17px] font-semibold text-[#1d1d1f] after:absolute after:inset-0 after:rounded-apple hover:text-brand-600"
                >
                  {project.name}
                </Link>
                <div className="mt-1.5 flex items-center gap-2 text-[13px] text-[#86868b]">
                  <span>{project.framework}</span>
                  <span>·</span>
                  <span>{new Date(project.created_at).toLocaleDateString("cs-CZ")}</span>
                </div>
              </div>

              {/* Dolní řádek – badge + akce */}
              <div className="relative z-10 mt-4 flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    PHASE_COLORS[project.phase] ?? "bg-[#f2f2f7] text-[#6e6e73]"
                  }`}
                >
                  {project.phase}
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/process?projectId=${project.id}`}
                    className="rounded-full border border-[#d2d2d7] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
                  >
                    Zpracovat →
                  </Link>

                  {/* Mazání – inline potvrzení */}
                  {deletingId === project.id ? (
                    <div className="flex h-7 w-7 items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#ff3b30] border-t-transparent" />
                    </div>
                  ) : confirmId === project.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] text-[#6e6e73]">Smazat?</span>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="rounded-full bg-[#ff3b30] px-3 py-1 text-[11px] font-medium text-white hover:bg-[#e03029]"
                      >
                        Ano
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="rounded-full border border-[#d2d2d7] px-3 py-1 text-[11px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
                      >
                        Ne
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(project.id)}
                      title="Smazat projekt"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#d2d2d7] transition-colors hover:bg-red-50 hover:text-[#ff3b30]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ErrorMessage from "@/components/ErrorMessage";
import { PHASE_COLORS } from "@/lib/constants";

type Project = {
  id: string;
  name: string;
  phase: string;
  framework: string;
  created_at: string;
};

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Dnes";
  if (days === 1) return "Včera";
  if (days < 7) return `Před ${days} dny`;
  return new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Nepodařilo se načíst projekty.");
        if (!json.error) setProjects(json.projects ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Nepodařilo se načíst projekty.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.framework.toLowerCase().includes(search.toLowerCase()) ||
        p.phase.toLowerCase().includes(search.toLowerCase())
      )
    : projects;

  return (
    <main className="animate-page-in mx-auto max-w-3xl px-6 py-10 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-title font-semibold tracking-tight text-apple-text-primary">
          Projekty
        </h1>
        <Link
          href="/projects/new"
          className="rounded-full bg-brand-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand-700"
        >
          + Nový projekt
        </Link>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat projekt…"
          className="w-full rounded-xl border border-apple-border-default bg-apple-bg-card px-4 py-2.5 text-body text-apple-text-primary placeholder:text-apple-text-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
        />
      </div>

      {error ? (
        <div className="mb-5">
          <ErrorMessage message={error} />
        </div>
      ) : null}

      {/* Project list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-shimmer h-[72px] rounded-apple" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-apple border border-apple-border-light bg-apple-bg-card py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-apple-bg-subtle">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-apple-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          {search ? (
            <p className="text-body text-apple-text-secondary">Žádné výsledky pro &bdquo;{search}&ldquo;</p>
          ) : (
            <>
              <p className="text-body font-medium text-apple-text-primary">Zatím žádné projekty</p>
              <Link
                href="/projects/new"
                className="mt-3 inline-block text-[14px] font-medium text-brand-600 hover:text-brand-700"
              >
                Vytvořit první projekt →
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center justify-between rounded-apple px-4 py-3.5 transition-colors hover:bg-apple-bg-card"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-apple-text-primary">{project.name}</p>
                <p className="mt-0.5 text-[12px] text-apple-text-tertiary">
                  {project.framework} · {relativeDate(project.created_at)}
                </p>
              </div>
              <span
                className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  PHASE_COLORS[project.phase] ?? "bg-apple-bg-subtle text-apple-text-secondary"
                }`}
              >
                {project.phase}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

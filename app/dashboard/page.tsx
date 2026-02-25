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

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/projects");
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || "Nepodařilo se načíst projekty.");
        return;
      }
      setProjects(json.projects ?? []);
    }
    load().catch((e) => setError(e instanceof Error ? e.message : "Unknown error"));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-600">Přehled projektů a posledních zpracování.</p>
      </header>

      <div className="mb-4 flex gap-3">
        <Link
          href="/projects/new"
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Nový projekt
        </Link>
        <Link
          href="/kb"
          className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-100"
        >
          Znalostní báze
        </Link>
        <Link
          href="/guide"
          className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-100"
        >
          Průvodce otázkami
        </Link>
      </div>

      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

      <section className="grid gap-4">
        {projects.map((project) => (
          <article
            key={project.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Link href={`/projects/${project.id}`} className="text-lg font-semibold hover:underline">
              {project.name}
            </Link>
            <p className="mt-1 text-sm text-slate-600">Fáze: {project.phase}</p>
            <p className="text-sm text-slate-600">Framework: {project.framework}</p>
            <p className="text-sm text-slate-600">Vytvořeno: {new Date(project.created_at).toLocaleString("cs-CZ")}</p>
          </article>
        ))}
        {projects.length === 0 ? (
          <p className="text-slate-600">Zatím nejsou vytvořené žádné projekty.</p>
        ) : null}
      </section>
    </main>
  );
}

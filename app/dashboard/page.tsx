"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PHASE_COLORS } from "@/lib/constants";
import Breadcrumbs from "@/components/Breadcrumbs";
import ConfirmDialog from "@/components/ConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import { SkeletonGrid } from "@/components/LoadingState";

type Project = {
  id: string;
  name: string;
  phase: string;
  framework: string;
  created_at: string;
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.phase.toLowerCase().includes(q) ||
      p.framework.toLowerCase().includes(q)
    );
  });

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
      toast.success("Projekt smazán.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Smazání selhalo";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      {/* Hlavička */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Projekty" }]} />
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">Projekty</h1>
          <p className="mt-1 text-[15px] text-[#6e6e73]">Přehled všech PM projektů</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-full bg-brand-600 px-5 py-2 text-[15px] font-medium text-white transition-colors hover:bg-brand-700"
        >
          + Nový projekt
        </Link>
      </div>

      {/* Vyhledávání */}
      {!loading && projects.length > 0 ? (
        <div className="mb-4">
          <input
            type="search"
            placeholder="Hledat projekty (název, fáze, framework)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-[14px] placeholder:text-[#aeaeb2] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          />
        </div>
      ) : null}

      {/* Chyba */}
      {error ? (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      ) : null}

      {/* Skeleton */}
      {loading ? (
        <SkeletonGrid count={4} />
      ) : projects.length === 0 ? (
        /* Empty state + onboarding */
        <div className="rounded-apple bg-white p-8 shadow-apple">
          <p className="text-[17px] font-semibold text-[#1d1d1f]">Jak začít s PM Assistant</p>
          <p className="mt-1 text-[14px] text-[#6e6e73]">Tři kroky a jste připraveni zpracovávat schůzky.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                icon: "📁",
                title: "Vytvoř projekt",
                desc: "Pojmenuj iniciativu, nastav framework (Univerzální nebo Produktový) a aktuální fázi."
              },
              {
                step: "2",
                icon: "📚",
                title: "Nahraj dokumenty",
                desc: "Přidej materiály do Znalostní báze – AI je použije jako kontext při generování."
              },
              {
                step: "3",
                icon: "✨",
                title: "Zpracuj nebo veď schůzku",
                desc: "Nahraj transkript k analýze, nebo spusť Průvodce pro strukturovaný rozhovor."
              }
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex flex-col rounded-xl border border-[#e8e8ed] bg-[#fafafa] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white">{step}</span>
                  <span className="text-xl">{icon}</span>
                </div>
                <p className="text-[14px] font-semibold text-[#1d1d1f]">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#6e6e73]">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/projects/new"
              className="rounded-full bg-brand-600 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand-700"
            >
              + Vytvořit první projekt
            </Link>
            <Link
              href="/kb"
              className="rounded-full border border-[#d2d2d7] px-5 py-2.5 text-[14px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
            >
              Znalostní báze →
            </Link>
          </div>
        </div>
      ) : (
        /* Projekt grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredProjects.map((project) => (
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
                    Zpracovat
                  </Link>
                  <Link
                    href={`/guide?projectId=${project.id}&mode=guide`}
                    className="rounded-full border border-[#d2d2d7] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
                  >
                    Průvodce
                  </Link>
                  <Link
                    href={`/guide?projectId=${project.id}&mode=canvas`}
                    className="rounded-full border border-[#d2d2d7] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
                    title="Příprava na schůzku – celá sada PM otázek"
                  >
                    Canvas
                  </Link>

                  <button
                    onClick={() => setConfirmId(project.id)}
                    title="Smazat projekt"
                    aria-label={`Smazat projekt ${project.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#d2d2d7] transition-colors hover:bg-red-50 hover:text-[#ff3b30] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          ))}
          {filteredProjects.length === 0 && projects.length > 0 ? (
            <p className="col-span-2 py-8 text-center text-[14px] text-[#6e6e73]">
              Žádný projekt neodpovídá hledanému výrazu.
            </p>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Smazat projekt?"
        message={
          confirmId
            ? `Projekt „${projects.find((p) => p.id === confirmId)?.name ?? ""}“ bude trvale smazán včetně všech transkriptů a kontextu.`
            : ""
        }
        confirmLabel="Smazat"
        onConfirm={() => confirmId && deleteProject(confirmId)}
        onCancel={() => setConfirmId(null)}
        loading={deletingId !== null}
      />
    </main>
  );
}

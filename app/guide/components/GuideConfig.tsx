import type { Project } from "../types";

const PHASES = ["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"];

type Props = {
  projects: Project[];
  selectedProject: Project | null;
  setSelectedProject: (p: Project | null) => void;
  phase: string;
  setPhase: (p: string) => void;
  framework: "Univerzální" | "Produktový";
  setFramework: (f: "Univerzální" | "Produktový") => void;
  onStart: () => void;
  isDone: boolean;
};

export function GuideConfig({
  projects,
  selectedProject,
  setSelectedProject,
  phase,
  setPhase,
  framework,
  setFramework,
  onStart,
  isDone
}: Props) {
  return (
    <div className="mb-4 shrink-0 space-y-4 rounded-apple bg-apple-bg-card p-5 shadow-apple">
      <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-brand-700">
          Před zpracováním potřebuji potvrdit
        </p>
        <p className="mt-2 text-[14px] text-apple-text-primary">
          1) V jaké fázi PM se projekt nachází?<br />
          2) Jaký typ frameworku použijeme? (Univerzální vs. Produktový)
        </p>
        <p className="mt-2 text-[13px] text-apple-text-secondary">
          Nevytvářím dokument, dokud nepotvrdíte výběrem níže.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-apple-text-tertiary">
            Projekt
          </label>
          <select
            className="w-full rounded-xl border border-apple-border-default bg-apple-bg-card px-3 py-2.5 text-[14px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
            value={selectedProject?.id ?? ""}
            onChange={(e) => {
              const p = projects.find((p) => p.id === e.target.value) ?? null;
              setSelectedProject(p);
              if (p) {
                setPhase(p.phase);
                setFramework(p.framework as "Univerzální" | "Produktový");
              }
            }}
          >
            {projects.length === 0 ? (
              <option value="">– žádné projekty –</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-apple-text-tertiary">
            Fáze
          </label>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="w-full rounded-xl border border-apple-border-default bg-apple-bg-card px-3 py-2.5 text-[14px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
          >
            {PHASES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-apple-text-tertiary">
            Framework
          </label>
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value as "Univerzální" | "Produktový")}
            className="w-full rounded-xl border border-apple-border-default bg-apple-bg-card px-3 py-2.5 text-[14px] focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
          >
            <option>Univerzální</option>
            <option>Produktový</option>
          </select>
        </div>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          Vytvoř projekt v sekci Projekty.
        </div>
      ) : null}
      <button
        onClick={onStart}
        disabled={!selectedProject}
        className="rounded-full bg-brand-600 px-5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {isDone ? "🔄 Spustit znovu" : "Potvrdit a spustit průvodce"}
      </button>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import ErrorMessage from "@/components/ErrorMessage";

const FRAMEWORKS = ["Univerzální", "Produktový"] as const;
const PROJECT_PHASES = ["Iniciace", "Plánování", "Realizace", "Closing", "Gate 1", "Gate 2", "Gate 3"] as const;

type Framework = (typeof FRAMEWORKS)[number];
type ProjectPhase = (typeof PROJECT_PHASES)[number];
type CreateProjectPayload = {
  name: string;
  framework: Framework;
  phase: ProjectPhase;
};

const FRAMEWORK_INFO: Record<Framework, string> = {
  Produktový: "Tvorba nebo redesign konkrétní služby / produktu JIC pro klienty.",
  Univerzální: "Interní projekty, procesní změny nebo infrastruktura."
};

function validateProjectPayload(payload: {
  name: string;
  framework: string;
  phase: string;
}): { success: true; data: CreateProjectPayload } | { success: false; error: string; fieldError?: { name?: string } } {
  if (payload.name.length < 3) {
    return { success: false, fieldError: { name: "Název musí mít 3–140 znaků." }, error: "Neplatný název projektu." };
  }

  if (payload.name.length > 140) {
    return { success: false, fieldError: { name: "Název může mít maximálně 140 znaků." }, error: "Neplatný název projektu." };
  }

  if (!FRAMEWORKS.includes(payload.framework as Framework)) {
    return { success: false, error: "Vyber platný typ frameworku." };
  }

  if (!PROJECT_PHASES.includes(payload.phase as ProjectPhase)) {
    return { success: false, error: "Vyber platnou počáteční fázi." };
  }

  return {
    success: true,
    data: {
      name: payload.name,
      framework: payload.framework as Framework,
      phase: payload.phase as ProjectPhase
    }
  };
}

export default function NewProjectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ name?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [framework, setFramework] = useState<Framework>("Univerzální");

  // Reset chyb při mountu – brání zobrazení starých chyb po browser back navigaci
  useEffect(() => {
    setError(null);
    setFieldError(null);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    const data = new FormData(e.currentTarget);
    const payload = {
      name: String(data.get("name") || "").trim(),
      framework: String(data.get("framework") || ""),
      phase: String(data.get("phase") || "")
    };

    const validation = validateProjectPayload(payload);
    if (!validation.success) {
      if (validation.fieldError) {
        setFieldError(validation.fieldError);
      } else {
        setError(validation.error);
      }
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data)
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Uložení projektu selhalo.");
      router.push(`/projects/${json.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při vytváření projektu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-8 py-10">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Projekty", href: "/dashboard" }, { label: "Nový projekt" }]} />
        <h1 className="mt-2 text-title font-semibold tracking-tight text-apple-text-primary">Nový projekt</h1>
        <p className="mt-1 text-body text-apple-text-secondary">Vyplň základní informace o projektu.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-apple bg-apple-bg-card p-8 shadow-apple">
        {/* Název */}
        <div>
          <label htmlFor="project-name" className="mb-2 block text-caption font-semibold uppercase tracking-wider text-apple-text-tertiary">
            Název projektu
          </label>
          <input
            id="project-name"
            name="name"
            required
            minLength={3}
            maxLength={140}
            aria-invalid={!!fieldError?.name}
            aria-describedby={fieldError?.name ? "project-name-error" : undefined}
            className={`w-full rounded-xl border px-4 py-2.5 text-body text-apple-text-primary placeholder:text-apple-text-muted focus:outline-none focus:ring-2 focus:ring-brand-600/20 ${
              fieldError?.name ? "border-[#ff3b30] focus:border-[#ff3b30]" : "border-apple-border-default focus:border-brand-600"
            }`}
            placeholder="Např. Scale-up program 2026"
            onChange={() => fieldError && setFieldError(null)}
          />
          {fieldError?.name ? (
            <p id="project-name-error" className="mt-1.5 text-caption text-[#c0392b]" role="alert">
              {fieldError.name}
            </p>
          ) : null}
        </div>

        {/* Framework */}
        <div>
          <label className="mb-3 block text-caption font-semibold uppercase tracking-wider text-apple-text-tertiary">
            Typ frameworku
          </label>
          <div className="grid grid-cols-2 gap-3">
            {FRAMEWORKS.map((fw) => (
              <label
                key={fw}
                className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                  framework === fw
                    ? "border-brand-600 bg-brand-50"
                    : "border-apple-border-light bg-apple-bg-subtle hover:border-apple-border-default"
                }`}
              >
                <input
                  type="radio"
                  name="framework"
                  value={fw}
                  className="sr-only"
                  checked={framework === fw}
                  onChange={() => setFramework(fw)}
                />
                {framework === fw && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                <p className="text-body font-semibold text-apple-text-primary">{fw}</p>
                <p className="mt-1 text-caption leading-snug text-apple-text-secondary">{FRAMEWORK_INFO[fw]}</p>
              </label>
            ))}
          </div>
        </div>

        {/* Fáze */}
        <div>
          <label className="mb-2 block text-caption font-semibold uppercase tracking-wider text-apple-text-tertiary">
            Počáteční fáze
          </label>
          <select
            name="phase"
            className="w-full rounded-xl border border-apple-border-default bg-apple-bg-card px-4 py-2.5 text-body text-apple-text-primary focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          >
            {PROJECT_PHASES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>

        {error ? (
          <ErrorMessage id="new-project-error" message={error} />
        ) : null}

        <button
          type="submit"
          disabled={loading}
          aria-describedby={error ? "new-project-error" : undefined}
          className="w-full rounded-full bg-brand-600 py-3 text-body font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Vytvářím..." : "Vytvořit projekt"}
        </button>
      </form>
    </main>
  );
}

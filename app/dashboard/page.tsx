"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ErrorMessage from "@/components/ErrorMessage";
import { PHASE_COLORS } from "@/lib/constants";

type Project = {
  id: string;
  name: string;
  phase: string;
  framework: string;
  created_at: string;
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Dobré ráno";
  if (h >= 12 && h < 18) return "Dobré odpoledne";
  return "Dobrý večer";
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Dnes";
  if (days === 1) return "Včera";
  if (days < 7) return `Před ${days} dny`;
  return new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });
}

const quickActions = [
  { label: "Zpracovat transkript", href: "/process", icon: "📝" },
  { label: "Průvodce schůzkou", href: "/guide", icon: "💬" },
  { label: "Nový projekt", href: "/projects/new", icon: "📁" },
  { label: "Znalostní báze", href: "/kb", icon: "📚" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = inputValue.trim();
    if (msg) {
      router.push(`/guide?message=${encodeURIComponent(msg)}`);
    } else {
      router.push("/guide");
    }
  }

  return (
    <main className="animate-page-in flex min-h-[calc(100vh-56px)] flex-col md:min-h-screen">
      {/* ── Hero: centered greeting + input ──────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
        {error ? (
          <div className="mb-6 w-full max-w-[640px]">
            <ErrorMessage message={error} />
          </div>
        ) : null}
        <h1 className="mb-8 text-center text-[28px] font-semibold tracking-tight text-apple-text-primary md:text-[32px]">
          <span className="mr-2 inline-block text-gold-400">✺</span>
          {getGreeting()}
        </h1>

        {/* Chat input */}
        <form onSubmit={handleSubmit} className="w-full max-w-[640px]">
          <div className="relative rounded-2xl border border-apple-border-default bg-apple-bg-card shadow-apple transition-shadow focus-within:border-brand-400 focus-within:shadow-apple-lg">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Na čem dnes pracuješ?"
              className="w-full rounded-2xl bg-transparent px-5 pb-14 pt-4 text-[15px] text-apple-text-primary placeholder:text-apple-text-muted focus:outline-none"
            />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <Link
                href="/process"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-apple-text-muted transition-colors hover:bg-apple-bg-subtle hover:text-apple-text-secondary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
              </Link>
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700"
                aria-label="Odeslat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3.105 2.29a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                </svg>
              </button>
            </div>
          </div>
        </form>

        {/* Quick action chips */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-1.5 rounded-full border border-apple-border-light bg-apple-bg-card px-4 py-2 text-[13px] font-medium text-apple-text-secondary transition-colors hover:border-apple-border-default hover:text-apple-text-primary"
            >
              <span>{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent projects (below hero) ─────────────────────────────── */}
      {!loading && projects.length > 0 ? (
        <div className="mx-auto w-full max-w-[640px] px-6 pb-10">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-apple-text-tertiary">
              Nedávné projekty
            </p>
            <Link href="/projects/new" className="text-[12px] font-medium text-brand-600 hover:text-brand-700">
              + Nový projekt
            </Link>
          </div>
          <div className="space-y-0.5">
            {projects.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-apple-bg-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-apple-text-primary">{project.name}</p>
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
        </div>
      ) : null}
    </main>
  );
}

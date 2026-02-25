"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

type ProcessResponse = {
  sessionId: string;
  output: string;
  meta: {
    lowKbConfidence: boolean;
    kbChunksUsed: number;
    changeSignals: string[];
  };
};

type Project = {
  id: string;
  name: string;
};

export default function ProcessPage() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((json) => setProjects(json.projects ?? []))
      .catch(() => undefined);
  }, []);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setResult(null);

    const payload = {
      projectId: String(formData.get("projectId") || ""),
      phase: String(formData.get("phase") || ""),
      framework: String(formData.get("framework") || ""),
      transcript: String(formData.get("transcript") || "")
    };

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Zpracování selhalo.");
      }

      setResult(json as ProcessResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznámá chyba");
    } finally {
      setLoading(false);
    }
  }

  async function onTranscriptFileChange(file: File | null) {
    if (!file) {
      return;
    }
    const text = await file.text();
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea[name='transcript']");
    if (textarea) {
      textarea.value = text;
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold">Zpracování transkriptu</h1>
      <p className="mt-2 text-slate-600">
        První funkční UI napojení na AI processing endpoint.
      </p>

      <form
        action={onSubmit}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {projects.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Nejdřív vytvoř projekt v sekci Dashboard.
          </p>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Project ID</span>
          <select
            name="projectId"
            defaultValue={projectIdParam ?? undefined}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.id})
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Fáze</span>
            <select
              name="phase"
              defaultValue="Plánování"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {[
                "Iniciace",
                "Plánování",
                "Realizace",
                "Closing",
                "Gate 1",
                "Gate 2",
                "Gate 3"
              ].map((phase) => (
                <option key={phase}>{phase}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Framework</span>
            <select
              name="framework"
              defaultValue="Univerzální"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option>Univerzální</option>
              <option>Produktový</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Transkript</span>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => onTranscriptFileChange(e.target.files?.[0] ?? null)}
            className="mb-2 block w-full text-sm"
          />
          <textarea
            name="transcript"
            rows={10}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Vlož transkript schůzky (min. 300 znaků)..."
          />
        </label>

        <button
          type="submit"
          disabled={loading || projects.length === 0}
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Zpracovávám..." : "Zpracovat"}
        </button>
      </form>

      {error ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 text-sm text-slate-600">
            Session ID: {result.sessionId} |{" "}
            KB chunks used: {result.meta.kbChunksUsed} | lowKBConfidence:{" "}
            {String(result.meta.lowKbConfidence)}
          </div>
          {result.meta.changeSignals.length > 0 ? (
            <ul className="mb-3 list-disc pl-5 text-sm text-amber-700">
              {result.meta.changeSignals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <pre className="whitespace-pre-wrap text-sm">{result.output}</pre>
        </section>
      ) : null}
    </main>
  );
}

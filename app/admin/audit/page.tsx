"use client";

import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ErrorMessage from "@/components/ErrorMessage";

type AuditLog = {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  project_create: "Vytvoření projektu",
  project_update: "Úprava projektu",
  project_delete: "Smazání projektu",
  transcript_process: "Zpracování transkriptu",
  guide_complete: "Dokončení průvodce",
  asana_export: "Export do Asany",
  kb_upload: "Nahrání do KB",
  kb_url_add: "Přidání URL do KB",
  kb_delete: "Smazání z KB",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setLogs(json.logs ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Chyba načítání"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-8 py-10">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Projekty", href: "/dashboard" }, { label: "Audit log" }]} />
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-apple-text-primary">
          Audit log
        </h1>
        <p className="mt-1 text-[15px] text-apple-text-secondary">
          Historie akcí v aplikaci (Admin).
        </p>
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-apple bg-apple-bg-card shadow-apple-sm" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-apple bg-apple-bg-card py-12 text-center shadow-apple">
          <p className="text-[14px] text-apple-text-secondary">Zatím žádné záznamy.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-apple bg-apple-bg-card shadow-apple">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-apple-bg-subtle bg-apple-bg-card">
                <th className="px-4 py-3 font-semibold text-apple-text-tertiary">Čas</th>
                <th className="px-4 py-3 font-semibold text-apple-text-tertiary">Akce</th>
                <th className="px-4 py-3 font-semibold text-apple-text-tertiary">Typ</th>
                <th className="px-4 py-3 font-semibold text-apple-text-tertiary">ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-apple-bg-subtle">
                  <td className="px-4 py-3 text-apple-text-secondary">
                    {new Date(log.created_at).toLocaleString("cs-CZ")}
                  </td>
                  <td className="px-4 py-3">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </td>
                  <td className="px-4 py-3 text-apple-text-secondary">{log.resource_type}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-apple-text-muted">
                    {log.resource_id ?? "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

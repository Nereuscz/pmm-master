"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
        <Link href="/dashboard" className="text-[14px] text-brand-600 hover:text-brand-700">
          ← Zpět na projekty
        </Link>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
          Audit log
        </h1>
        <p className="mt-1 text-[15px] text-[#6e6e73]">
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
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-apple bg-white shadow-apple-sm" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-apple bg-white py-12 text-center shadow-apple">
          <p className="text-[14px] text-[#6e6e73]">Zatím žádné záznamy.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-apple bg-white shadow-apple">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-[#f2f2f7] bg-[#fafafa]">
                <th className="px-4 py-3 font-semibold text-[#86868b]">Čas</th>
                <th className="px-4 py-3 font-semibold text-[#86868b]">Akce</th>
                <th className="px-4 py-3 font-semibold text-[#86868b]">Typ</th>
                <th className="px-4 py-3 font-semibold text-[#86868b]">ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[#f2f2f7]">
                  <td className="px-4 py-3 text-[#6e6e73]">
                    {new Date(log.created_at).toLocaleString("cs-CZ")}
                  </td>
                  <td className="px-4 py-3">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </td>
                  <td className="px-4 py-3 text-[#6e6e73]">{log.resource_type}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[#aeaeb2]">
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

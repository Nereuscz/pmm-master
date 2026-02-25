import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-brand-700">PM Assistant v0.1</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          MVP základ PM Assistantu je implementovaný
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          Tento build obsahuje funkční základ: projekty, zpracování transkriptu,
          průvodce otázkami, projektovou paměť, admin znalostní bázi, sync logy a
          interní export joby.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            Otevřít dashboard
          </Link>
          <Link
            href="/process"
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-100"
          >
            Zpracovat transkript
          </Link>
          <Link
            href="/projects/new"
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-100"
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
      </div>
    </main>
  );
}

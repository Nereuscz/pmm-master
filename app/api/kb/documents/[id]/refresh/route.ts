import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { upsertDocumentWithChunks } from "@/lib/kb";
import { extractTextFromHtml } from "@/lib/html-to-text";
import { getAuthUser, unauthorized, canManageKb, forbidden } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MAX_CONTENT_LENGTH = 500_000;
const FETCH_TIMEOUT_MS = 15_000;

function isSafeUrl(str: string): boolean {
  try {
    const url = new URL(str);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return false;
    if (/^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\.|^0\.|^169\.254\./.test(host)) return false;
    if (host === "[::1]" || host === "0.0.0.0") return false;
    return true;
  } catch {
    return false;
  }
}

type Params = { params: { id: string } };

export async function POST(_: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canManageKb(user)) return forbidden();

  const db = ensureDb();
  const { data: doc, error } = await db
    .from("kb_documents")
    .select("id,title,category,source,source_url,visibility,uploaded_by")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: "Dokument nebyl nalezen." }, { status: 404 });
  }

  if (doc.source !== "url" || !doc.source_url) {
    return NextResponse.json(
      { error: "Obnovení je možné jen u dokumentů přidaných z URL." },
      { status: 400 }
    );
  }

  if (!isSafeUrl(doc.source_url)) {
    return NextResponse.json(
      { error: "Uložená URL není bezpečná pro obnovení." },
      { status: 400 }
    );
  }

  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(doc.source_url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PM-Assistant/1.0; +https://github.com/Nereuscz/pmm-master)",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Stránka vrátila ${res.status}.` },
        { status: 422 }
      );
    }

    html = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nepodařilo se načíst stránku.";
    return NextResponse.json(
      { error: msg.includes("abort") ? "Vypršel časový limit." : msg },
      { status: 422 }
    );
  }

  if (html.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: "Stránka je příliš velká." },
      { status: 422 }
    );
  }

  const content = extractTextFromHtml(html);
  if (content.length < 100) {
    return NextResponse.json(
      { error: "Stránka neobsahuje dostatek textu." },
      { status: 422 }
    );
  }

  try {
    const result = await upsertDocumentWithChunks({
      documentId: params.id,
      title: doc.title,
      category: doc.category,
      source: "url",
      content,
      sourceUrl: doc.source_url,
      uploadedBy: doc.uploaded_by ?? undefined,
      visibility: (doc.visibility ?? "global") as "global" | "team",
    });

    await logAudit({
      userId: user.id,
      action: "kb_url_add",
      resourceType: "kb_document",
      resourceId: params.id,
    });

    return NextResponse.json({
      ...result,
      extractedLength: content.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chyba při obnovení.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

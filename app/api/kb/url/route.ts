import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, canManageKb, forbidden } from "@/lib/auth-guard";
import { upsertDocumentWithChunks } from "@/lib/kb";
import { extractTextFromHtml } from "@/lib/html-to-text";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MAX_CONTENT_LENGTH = 500_000;
const FETCH_TIMEOUT_MS = 15_000;

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return false;
    if (host === "[::1]" || host === "0.0.0.0") return false;
    if (/^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\.|^0\.|^169\.254\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canManageKb(user)) return forbidden();

  let body: { url: string; title?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const url = body.url?.trim();
  const title = body.title?.trim();
  const category = (body.category?.trim() || "general").slice(0, 60);

  if (!url) {
    return NextResponse.json({ error: "Chybí URL adresa." }, { status: 400 });
  }
  if (!isValidUrl(url)) {
    return NextResponse.json({ error: "Neplatná URL adresa. Povoleno: http/https." }, { status: 400 });
  }

  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PM-Assistant/1.0; +https://github.com/Nereuscz/pmm-master)",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Stránka vrátila ${res.status}. Zkontrolujte URL.` },
        { status: 422 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return NextResponse.json(
        { error: "URL nevede na HTML stránku. Podporujeme pouze webové stránky." },
        { status: 422 }
      );
    }

    html = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nepodařilo se načíst stránku.";
    return NextResponse.json(
      { error: msg.includes("abort") ? "Vypršel časový limit (15 s)." : msg },
      { status: 422 }
    );
  }

  if (html.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `Stránka je příliš velká (max ${MAX_CONTENT_LENGTH / 1000} kB).` },
      { status: 422 }
    );
  }

  const content = extractTextFromHtml(html);
  if (content.length < 100) {
    return NextResponse.json(
      { error: "Stránka neobsahuje dostatek čitelného textu (min. 100 znaků)." },
      { status: 422 }
    );
  }

  const docTitle = title || new URL(url).hostname.replace(/^www\./, "");

  try {
    const result = await upsertDocumentWithChunks({
      title: docTitle,
      category,
      source: "url",
      content,
      sourceUrl: url,
      uploadedBy: user.id,
      visibility: "global",
    });

    await logAudit({
      userId: user.id,
      action: "kb_url_add",
      resourceType: "kb_document",
      resourceId: result.documentId,
    });

    return NextResponse.json(
      { ...result, extractedLength: content.length },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chyba při ukládání.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

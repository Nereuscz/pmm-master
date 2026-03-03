import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { ensureDb } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().nullable(),
});

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  try {
    const db = ensureDb();
    const { data } = await db
      .from("users")
      .select("asana_token_encrypted")
      .eq("id", user.id)
      .maybeSingle();
    const hasToken = !!data?.asana_token_encrypted;
    return NextResponse.json({ hasToken });
  } catch {
    return NextResponse.json({ hasToken: false });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatný vstup." }, { status: 400 });
  }

  const token = parsed.data.token?.trim() || null;
  const encrypted = token
    ? Buffer.from(token, "utf-8").toString("base64")
    : null;

  try {
    const db = ensureDb();
    const { error } = await db
      .from("users")
      .update({ asana_token_encrypted: encrypted })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: "Nepodařilo se uložit token." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Databáze není dostupná." }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tryGetDb } from "@/lib/db";
import { getAuthUser, unauthorized, forbidden, isAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

const postSchema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)]),
});

/** GET: aktuální feedback uživatele pro session */
export async function GET(_: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const db = tryGetDb();
  if (!db) return NextResponse.json({ feedback: null });

  const { data: session } = await db
    .from("sessions")
    .select("id, project_id")
    .eq("id", params.id)
    .single();

  if (!session) return NextResponse.json({ error: "Session nenalezena." }, { status: 404 });

  const { data: project } = await db
    .from("projects")
    .select("owner_id")
    .eq("id", session.project_id)
    .single();

  if (!project) return NextResponse.json({ error: "Projekt nenalezen." }, { status: 404 });
  if (!isAdmin(user) && project.owner_id !== user.id) return forbidden();

  const { data: feedback } = await db
    .from("session_feedback")
    .select("rating")
    .eq("session_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ rating: feedback?.rating ?? null });
}

/** POST: uložit nebo změnit feedback */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatný vstup. rating: 1 nebo -1" }, { status: 400 });
  }

  const db = tryGetDb();
  if (!db) return NextResponse.json({ error: "DB není dostupná." }, { status: 503 });

  const { data: session } = await db
    .from("sessions")
    .select("id, project_id")
    .eq("id", params.id)
    .single();

  if (!session) return NextResponse.json({ error: "Session nenalezena." }, { status: 404 });

  const { data: project } = await db
    .from("projects")
    .select("owner_id")
    .eq("id", session.project_id)
    .single();

  if (!project) return NextResponse.json({ error: "Projekt nenalezen." }, { status: 404 });
  if (!isAdmin(user) && project.owner_id !== user.id) return forbidden();

  const { error } = await db
    .from("session_feedback")
    .upsert(
      {
        session_id: params.id,
        user_id: user.id,
        rating: parsed.data.rating,
      },
      { onConflict: "session_id,user_id" }
    );

  if (error) {
    return NextResponse.json({ error: "Uložení feedbacku selhalo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rating: parsed.data.rating });
}

/** DELETE: odebrat feedback (toggle off) */
export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const db = tryGetDb();
  if (!db) return NextResponse.json({ error: "DB není dostupná." }, { status: 503 });

  const { data: session } = await db
    .from("sessions")
    .select("id, project_id")
    .eq("id", params.id)
    .single();

  if (!session) return NextResponse.json({ error: "Session nenalezena." }, { status: 404 });

  const { data: project } = await db
    .from("projects")
    .select("owner_id")
    .eq("id", session.project_id)
    .single();

  if (!project) return NextResponse.json({ error: "Projekt nenalezen." }, { status: 404 });
  if (!isAdmin(user) && project.owner_id !== user.id) return forbidden();

  await db
    .from("session_feedback")
    .delete()
    .eq("session_id", params.id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, rating: null });
}

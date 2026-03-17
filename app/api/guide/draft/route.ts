import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDb, requireProjectOwnership } from "@/lib/db";
import { getAuthUser, unauthorized, forbidden, isAdmin } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { throwIfDbError } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

const answerSchema = z.object({
  questionId: z.string().min(1).max(200),
  question: z.string().min(1).max(4000),
  answer: z.string().max(20000),
});

const questionSchema = z.object({
  id: z.string().min(1).max(200),
  text: z.string().min(1).max(4000),
  hint: z.string().max(4000),
  context: z.string().max(8000).optional(),
});

const chatMessageSchema = z
  .object({
    id: z.string().min(1).max(120),
    role: z.enum(["ai", "user"]),
    kind: z.string().max(40).optional(),
    text: z.string().max(20000).optional(),
    answerToQuestionId: z.string().max(200).optional(),
    q: questionSchema.optional(),
    questions: z.array(z.string().max(4000)).max(40).optional(),
    answers: z.record(z.string().max(20000)).optional(),
    submitted: z.boolean().optional(),
    content: z.string().max(120000).optional(),
    phase: z.string().max(100).optional(),
    framework: z.enum(["Univerzální", "Produktový"]).optional(),
    sessionId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    saved: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "ai" && !value.kind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kind"],
        message: "AI zpráva musí obsahovat 'kind'.",
      });
    }
    if (value.role === "user" && !value.text) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["text"],
        message: "User zpráva musí obsahovat 'text'.",
      });
    }
  });

const upsertSchema = z.object({
  projectId: z.string().uuid(),
  phase: z.string().min(1).max(100),
  framework: z.enum(["Univerzální", "Produktový"]),
  answers: z.array(answerSchema).max(300),
  messages: z.array(chatMessageSchema).max(600),
  uploadedContext: z.string().max(300000).optional(),
});

const deleteSchema = z.object({
  projectId: z.string().uuid(),
  phase: z.string().min(1).max(100),
  framework: z.enum(["Univerzální", "Produktový"]),
});

async function assertProjectAccess(projectId: string, userId: string, admin: boolean) {
  const ownership = await requireProjectOwnership(projectId, userId, admin);
  if (!ownership.ok) {
    if (ownership.status === 403) {
      return forbidden();
    }
    return NextResponse.json({ error: ownership.message }, { status: 404 });
  }

  return null;
}

// ── GET ?projectId=&phase=&framework= ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? "";
  const phase = searchParams.get("phase") ?? "";
  const framework = searchParams.get("framework") ?? "";

  if (!projectId || !phase || !framework) {
    return NextResponse.json({ error: "Chybí parametry." }, { status: 400 });
  }
  const parsedProjectId = z.string().uuid().safeParse(projectId);
  if (!parsedProjectId.success) {
    return NextResponse.json({ error: "Neplatný projectId." }, { status: 400 });
  }

  const ownershipResponse = await assertProjectAccess(parsedProjectId.data, user.id, isAdmin(user));
  if (ownershipResponse) return ownershipResponse;

  const db = ensureDb();
  const { data, error } = await db
    .from("guide_drafts")
    .select("id, answers, messages, uploaded_context, updated_at")
    .eq("project_id", parsedProjectId.data)
    .eq("phase", phase)
    .eq("framework", framework)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    logApiError("/api/guide/draft GET", error);
    return NextResponse.json({ error: "Načtení draftu selhalo." }, { status: 500 });
  }

  return NextResponse.json({ draft: data ?? null });
}

// ── PUT { projectId, phase, framework, answers, messages } ────────────────────

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const parsed = upsertSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatný vstup.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, phase, framework, answers, messages, uploadedContext } = parsed.data;
  const ownershipResponse = await assertProjectAccess(projectId, user.id, isAdmin(user));
  if (ownershipResponse) return ownershipResponse;

  const db = ensureDb();

  try {
    const { error } = await db.from("guide_drafts").upsert(
      {
        project_id: projectId,
        phase,
        framework,
        owner_id: user.id,
        answers,
        messages,
        uploaded_context: uploadedContext ?? "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,phase,framework,owner_id" }
    );
    throwIfDbError(error, "Uložení draftu selhalo.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    logApiError("/api/guide/draft PUT", e);
    return NextResponse.json({ error: "Uložení draftu selhalo." }, { status: 500 });
  }
}

// ── DELETE { projectId, phase, framework } ────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatný vstup." }, { status: 400 });
  }

  const { projectId, phase, framework } = parsed.data;
  const ownershipResponse = await assertProjectAccess(projectId, user.id, isAdmin(user));
  if (ownershipResponse) return ownershipResponse;

  const db = ensureDb();

  try {
    const { error } = await db
      .from("guide_drafts")
      .delete()
      .eq("project_id", projectId)
      .eq("phase", phase)
      .eq("framework", framework)
      .eq("owner_id", user.id);
    throwIfDbError(error, "Smazání draftu selhalo.");

    return NextResponse.json({ ok: true });
  } catch (e) {
    logApiError("/api/guide/draft DELETE", e);
    return NextResponse.json({ error: "Smazání draftu selhalo." }, { status: 500 });
  }
}

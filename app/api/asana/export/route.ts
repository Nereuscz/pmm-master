import { NextRequest, NextResponse } from "next/server";
import { asanaExportSchema } from "@/lib/schemas";
import { ensureDb } from "@/lib/db";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { getValidAsanaToken } from "@/lib/asana-auth";
import { createTask, createSubtask } from "@/lib/asana-api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  try {
    const json = await request.json();
    const parsed = asanaExportSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Neplatný payload exportu.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const db = ensureDb();

    const { data: existingJob } = await db
      .from("export_jobs")
      .select("id,idempotency_key,status,created_objects_json")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existingJob) {
      return NextResponse.json({
        exportJobId: existingJob.id,
        idempotencyKey: existingJob.idempotency_key,
        status: existingJob.status,
        created: existingJob.created_objects_json,
        idempotentHit: true
      });
    }

    const { data: session, error: sessionError } = await db
      .from("sessions")
      .select("id")
      .eq("id", input.sessionId)
      .maybeSingle();
    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session pro export nebyla nalezena." },
        { status: 404 }
      );
    }

    const accessToken = await getValidAsanaToken(user.id);
    let createdObjects: { mainTaskId: string; subtaskIds: string[]; simulated?: boolean };

    if (accessToken) {
      const mainNotes = input.sections
        .map((s) => `**${s.question}**\n${s.answer}`)
        .join("\n\n---\n\n");
      const mainTask = await createTask(
        accessToken,
        input.asanaProjectId,
        input.title,
        mainNotes
      );
      const subtaskIds: string[] = [];
      for (const section of input.sections) {
        const sub = await createSubtask(
          accessToken,
          mainTask.gid,
          section.question,
          section.answer
        );
        subtaskIds.push(sub.gid);
      }
      createdObjects = {
        mainTaskId: mainTask.gid,
        subtaskIds,
      };
    } else {
      createdObjects = {
        simulated: true,
        mainTaskId: `task_${Date.now()}`,
        subtaskIds: input.sections.map((_, i) => `sub_${i}`),
      };
    }

    const { data: created, error } = await db
      .from("export_jobs")
      .insert({
        session_id: input.sessionId,
        asana_project_id: input.asanaProjectId,
        status: accessToken ? "exported" : "simulated",
        idempotency_key: input.idempotencyKey,
        created_objects_json: createdObjects
      })
      .select("id,status,idempotency_key,created_objects_json")
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: "Nepodařilo se založit export job.", details: error?.message },
        { status: 500 }
      );
    }

    await logAudit({
      userId: user.id,
      action: "asana_export",
      resourceType: "export_job",
      resourceId: created.id,
    });

    return NextResponse.json({
      exportJobId: created.id,
      idempotencyKey: created.idempotency_key,
      status: created.status,
      created: created.created_objects_json,
      idempotentHit: false
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown export error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

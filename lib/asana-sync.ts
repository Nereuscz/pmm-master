import { ensureDb } from "./db";
import { getValidAsanaToken } from "./asana-auth";
import { getProjectSections, getTasksForProject, type AsanaTaskFull } from "./asana-api";
import { summarizeForContext } from "./text";
import { mapAsanaPhaseToProjectPhase, buildAsanaMetadata } from "./asana-import";

/** Vrátí snapshot text pro projekt, nebo null pokud není k dispozici. */
export async function getAsanaSnapshotForProject(projectId: string): Promise<string | null> {
  const db = ensureDb();
  const { data } = await db
    .from("asana_sync_snapshot")
    .select("snapshot_text")
    .eq("project_id", projectId)
    .maybeSingle();
  return data?.snapshot_text?.trim() ?? null;
}

const MAX_SNAPSHOT_CHARS = 18_000;

export type SyncResult =
  | { ok: true; taskCount: number; sectionCount: number }
  | { ok: false; error: string };

/**
 * Stáhne snapshot z Asana projektu a uloží ho do asana_sync_snapshot.
 * Používá token vlastníka projektu.
 */
export async function syncProjectAsanaSnapshot(projectId: string): Promise<SyncResult> {
  const started = Date.now();
  const db = ensureDb();

  const { data: project, error: projectError } = await db
    .from("projects")
    .select("id, owner_id, asana_project_id, asana_task_id, phase")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project?.asana_project_id) {
    return { ok: false, error: "Projekt nemá propojený Asana projekt." };
  }

  const token = await getValidAsanaToken(project.owner_id);
  if (!token) {
    return { ok: false, error: "Vlastník projektu nemá platný Asana token." };
  }

  try {
    const [sections, tasks] = await Promise.all([
      getProjectSections(token, project.asana_project_id),
      getTasksForProject(token, project.asana_project_id),
    ]);

    const snapshotText = formatSnapshotForAi(sections, tasks);

    // Aktualizace fáze, popisu a metadat u importovaných projektů (asana_task_id)
    if (project.asana_task_id) {
      const sourceTask = tasks.find((t) => t.gid === project.asana_task_id);
      if (sourceTask) {
        const newPhase = mapAsanaPhaseToProjectPhase(sourceTask.custom_fields);
        const newDescription = sourceTask.notes?.trim() || null;
        const newMetadata = buildAsanaMetadata(sourceTask.custom_fields);

        const updates: Record<string, unknown> = {
          phase: newPhase,
          description: newDescription,
          asana_metadata: newMetadata,
          updated_at: new Date().toISOString(),
        };
        await db.from("projects").update(updates).eq("id", projectId);
      }
    }

    await db
      .from("asana_sync_snapshot")
      .upsert(
        {
          project_id: projectId,
          snapshot_text: snapshotText,
          synced_at: new Date().toISOString(),
          task_count: tasks.length,
          section_count: sections.length,
        },
        { onConflict: "project_id" }
      );

    await db.from("asana_sync_log").insert({
      project_id: projectId,
      status: "success",
      duration_ms: Date.now() - started,
    });

    return { ok: true, taskCount: tasks.length, sectionCount: sections.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznámá chyba";
    await db.from("asana_sync_log").insert({
      project_id: projectId,
      status: "error",
      error_message: message,
      duration_ms: Date.now() - started,
    });
    return { ok: false, error: message };
  }
}

function formatSnapshotForAi(
  sections: Array<{ gid: string; name: string }>,
  tasks: AsanaTaskFull[]
): string {
  const sectionMap = new Map(sections.map((s) => [s.gid, s.name]));
  const tasksBySection = new Map<string, AsanaTaskFull[]>();

  for (const task of tasks) {
    const sectionGid = task.memberships?.[0]?.section?.gid;
    const sectionName = sectionGid
      ? sectionMap.get(sectionGid) ?? task.memberships?.[0]?.section?.name ?? "Bez sekce"
      : "Bez sekce";
    if (!tasksBySection.has(sectionName)) {
      tasksBySection.set(sectionName, []);
    }
    tasksBySection.get(sectionName)!.push(task);
  }

  const lines: string[] = [];
  const sortedSections = [...tasksBySection.keys()].sort(
    (a, b) => (a === "Bez sekce" ? 1 : 0) - (b === "Bez sekce" ? 1 : 0)
  );

  for (const sectionName of sortedSections) {
    const sectionTasks = tasksBySection.get(sectionName) ?? [];
    lines.push(`[${sectionName}]`);
    for (const t of sectionTasks) {
      const status = t.completed ? "✓" : "○";
      const assignee = t.assignee?.name ? ` @${t.assignee.name}` : "";
      const due = t.due_on ? ` due:${t.due_on}` : "";
      const custom =
        t.custom_fields?.length && t.custom_fields.some((c) => c.display_value)
          ? ` [${t.custom_fields.map((c) => `${c.name || c.gid}: ${c.display_value ?? ""}`).join("; ")}]`
          : "";
      lines.push(`  ${status} ${t.name}${assignee}${due}${custom}`);
      if (t.notes?.trim()) {
        lines.push(`    - ${summarizeForContext(t.notes, 400)}`);
      }
    }
    lines.push("");
  }

  let text = lines.join("\n").trim();
  if (text.length > MAX_SNAPSHOT_CHARS) {
    text = text.slice(0, MAX_SNAPSHOT_CHARS - 3) + "...";
  }
  return text || "Žádné tasky v projektu.";
}

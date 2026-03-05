import { ensureDb } from "./db";
import { getValidAsanaToken } from "./asana-auth";
import { getParentTasksForProject } from "./asana-api";

export const VALID_PHASES = [
  "Iniciace",
  "Plánování",
  "Realizace",
  "Closing",
  "Gate 1",
  "Gate 2",
  "Gate 3",
] as const;

/** Mapuje Asana custom field "Project Phase" na naši fázi. */
export function mapAsanaPhaseToProjectPhase(
  customFields?: Array<{ gid: string; name?: string; display_value?: string }>
): (typeof VALID_PHASES)[number] {
  const phaseField = customFields?.find(
    (c) =>
      c.display_value &&
      (c.name?.toLowerCase().includes("phase") ||
        c.name?.toLowerCase().includes("fáze") ||
        c.name?.toLowerCase().includes("faze"))
  );
  const val = (phaseField?.display_value ?? "").trim().toLowerCase();

  const mapping: Record<string, (typeof VALID_PHASES)[number]> = {
    planning: "Plánování",
    plánování: "Plánování",
    planovani: "Plánování",
    initiation: "Iniciace",
    iniciace: "Iniciace",
    execution: "Realizace",
    realizace: "Realizace",
    closing: "Closing",
    "gate 1": "Gate 1",
    "gate 2": "Gate 2",
    "gate 3": "Gate 3",
  };

  return mapping[val] ?? "Iniciace";
}

/** Vytvoří objekt custom polí z Asana tasku. */
function buildAsanaMetadata(
  customFields?: Array<{ gid: string; name?: string; display_value?: string }>
): Record<string, string> {
  if (!customFields?.length) return {};
  const out: Record<string, string> = {};
  for (const c of customFields) {
    const name = c.name?.trim();
    if (!name) continue;
    const val = c.display_value;
    if (val != null && val !== "") {
      out[name] = typeof val === "string" ? val : String(val);
    }
  }
  return out;
}

export function formatImportContext(
  description: string | null,
  metadata: Record<string, string>
): string {
  const parts: string[] = [];
  if (description?.trim()) {
    parts.push("## Popis\n\n" + description.trim());
  }
  if (Object.keys(metadata).length > 0) {
    parts.push(
      "## Metadata z Asany\n\n" +
        Object.entries(metadata)
          .map(([k, v]) => `- **${k}:** ${v}`)
          .join("\n")
    );
  }
  return parts.join("\n\n") || "";
}

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export async function importParentTasksFromAsana(
  asanaProjectId: string,
  ownerId: string
): Promise<ImportResult> {
  const token = await getValidAsanaToken(ownerId);
  if (!token) {
    return { imported: 0, skipped: 0, errors: ["Uživatel nemá platný Asana token."] };
  }

  const tasks = await getParentTasksForProject(token, asanaProjectId);
  const db = ensureDb();
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (const task of tasks) {
    try {
      const existing = await db
        .from("projects")
        .select("id")
        .eq("asana_task_id", task.gid)
        .maybeSingle();

      if (existing?.data) {
        result.skipped += 1;
        continue;
      }

      const phase = mapAsanaPhaseToProjectPhase(task.custom_fields);
      const name = task.name?.trim() || `Projekt ${task.gid}`;
      if (name.length < 3) {
        result.errors.push(`Task ${task.gid}: název příliš krátký`);
        continue;
      }

      const description = task.notes?.trim() || null;
      const asanaMetadata = buildAsanaMetadata(task.custom_fields);

      const { data: project, error } = await db
        .from("projects")
        .insert({
          name: name.slice(0, 140),
          framework: "Univerzální",
          phase,
          owner_id: ownerId,
          asana_project_id: asanaProjectId,
          asana_task_id: task.gid,
          description,
          asana_metadata: Object.keys(asanaMetadata).length > 0 ? asanaMetadata : {},
        })
        .select("id")
        .single();

      if (error || !project) {
        result.errors.push(`Task ${task.gid}: ${error?.message ?? "Vytvoření selhalo"}`);
        continue;
      }

      const importContext = formatImportContext(description, asanaMetadata);
      await db.from("project_context").upsert({
        project_id: project.id,
        accumulated_context: importContext,
        last_updated: new Date().toISOString(),
      });

      result.imported += 1;
    } catch (err) {
      result.errors.push(
        `Task ${task.gid}: ${err instanceof Error ? err.message : "Neznámá chyba"}`
      );
    }
  }

  return result;
}

import { supabaseAdmin } from "./supabase-admin";

function ensureDb() {
  if (!supabaseAdmin) {
    throw new Error("Supabase není nakonfigurovaný. Doplň SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabaseAdmin;
}

export async function requireProject(projectId: string) {
  const db = ensureDb();
  const { data, error } = await db
    .from("projects")
    .select("id,name,framework,phase,owner_id,created_at,updated_at")
    .eq("id", projectId)
    .single();
  if (error || !data) {
    throw new Error("Projekt nebyl nalezen.");
  }
  return data;
}

export async function ensureUser(userId: string) {
  const db = ensureDb();
  const { data: existing } = await db.from("users").select("id").eq("id", userId).maybeSingle();
  if (existing) {
    return existing.id;
  }
  const { data, error } = await db
    .from("users")
    .insert({
      id: userId,
      email: `local-${userId}@pm-assistant.local`,
      role: "PM"
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Nepodařilo se vytvořit fallback uživatele. ${error?.message ?? ""}`.trim());
  }
  return data.id;
}

/**
 * Upsert uživatele přihlášeného přes Azure AD.
 * Pokud uživatel existuje (dle ms_id), aktualizuje email.
 * Pokud neexistuje, vytvoří nového s rolí PM.
 */
export async function upsertUserFromAzure(input: {
  msId: string;
  email: string;
}): Promise<{ id: string; role: "Admin" | "PM" | "Viewer" }> {
  const db = ensureDb();

  const { data: existing } = await db
    .from("users")
    .select("id,role")
    .eq("ms_id", input.msId)
    .maybeSingle();

  if (existing) {
    await db.from("users").update({ email: input.email }).eq("id", existing.id);
    return { id: existing.id, role: existing.role as "Admin" | "PM" | "Viewer" };
  }

  const { data, error } = await db
    .from("users")
    .insert({ ms_id: input.msId, email: input.email, role: "PM" })
    .select("id,role")
    .single();

  if (error || !data) {
    throw new Error(`Nepodařilo se vytvořit uživatele z Azure AD. ${error?.message ?? ""}`.trim());
  }
  return { id: data.id, role: data.role as "Admin" | "PM" | "Viewer" };
}

export async function getOrCreateProjectContext(projectId: string) {
  const db = ensureDb();
  const { data } = await db
    .from("project_context")
    .select("project_id,accumulated_context,last_updated")
    .eq("project_id", projectId)
    .maybeSingle();

  if (data) {
    return data;
  }

  const { data: created, error } = await db
    .from("project_context")
    .insert({
      project_id: projectId,
      accumulated_context: ""
    })
    .select("project_id,accumulated_context,last_updated")
    .single();

  if (error || !created) {
    throw new Error("Nepodařilo se inicializovat projektový kontext.");
  }
  return created;
}

export async function getLastSession(projectId: string) {
  const db = ensureDb();
  const { data } = await db
    .from("sessions")
    .select("id,phase,ai_output,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export { ensureDb };

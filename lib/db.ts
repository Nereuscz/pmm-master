import { supabaseAdmin } from "./supabase-admin";

function ensureDb() {
  if (!supabaseAdmin) {
    throw new Error("Supabase není nakonfigurovaný. Doplň SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabaseAdmin;
}

/** Vrátí Supabase klienta nebo null (bez vyhození chyby) – vhodné pro optional DB operace */
function tryGetDb() {
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

export type RequireProjectOwnershipResult =
  | { ok: true; project: Awaited<ReturnType<typeof requireProject>> }
  | { ok: false; status: 403 }
  | { ok: false; status: 404; message: string };

/**
 * Ověří existenci projektu a vlastnictví (owner_id === userId nebo Admin).
 * Použij pro API route, které pracují s projektem – chrání před IDOR.
 */
export async function requireProjectOwnership(
  projectId: string,
  userId: string,
  isAdmin: boolean
): Promise<RequireProjectOwnershipResult> {
  const db = ensureDb();
  const { data, error } = await db
    .from("projects")
    .select("id,name,framework,phase,owner_id,created_at,updated_at")
    .eq("id", projectId)
    .single();
  if (error || !data) {
    return { ok: false, status: 404, message: "Projekt nebyl nalezen." };
  }
  if (!isAdmin && data.owner_id !== userId) {
    // Return 404 instead of 403 to prevent project ID enumeration
    return { ok: false, status: 404, message: "Projekt nebyl nalezen." };
  }
  return { ok: true, project: data };
}

export async function ensureUser(userId: string) {
  const db = ensureDb();
  const { data, error } = await db
    .from("users")
    .upsert(
      {
        id: userId,
        email: `local-${userId}@pm-assistant.local`,
        role: "PM"
      },
      { onConflict: "id", ignoreDuplicates: true }
    )
    .select("id")
    .single();
  if (error || !data) {
    // Fallback: try select if upsert fails (e.g. unique constraint race)
    const { data: existing } = await db.from("users").select("id").eq("id", userId).maybeSingle();
    if (existing) return existing.id;
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

  // Try upsert; on conflict update email but keep existing role
  const { data, error } = await db
    .from("users")
    .upsert(
      { ms_id: input.msId, email: input.email, role: "PM" },
      { onConflict: "ms_id" }
    )
    .select("id,role")
    .single();

  if (error || !data) {
    // Fallback: select if upsert fails
    const { data: existing } = await db
      .from("users")
      .select("id,role")
      .eq("ms_id", input.msId)
      .maybeSingle();
    if (existing) {
      return { id: existing.id, role: existing.role as "Admin" | "PM" | "Viewer" };
    }
    throw new Error(`Nepodařilo se vytvořit uživatele z Azure AD. ${error?.message ?? ""}`.trim());
  }
  return { id: data.id, role: data.role as "Admin" | "PM" | "Viewer" };
}

/**
 * Upsert uživatele přihlášeného přes Asana.
 * Pokud uživatel existuje (dle asana_user_id), aktualizuje email.
 * Pokud neexistuje, vytvoří nového s rolí PM.
 */
export async function upsertUserFromAsana(input: {
  asanaGid: string;
  email: string;
  name?: string;
}): Promise<{ id: string; role: "Admin" | "PM" | "Viewer" }> {
  const db = ensureDb();
  const email =
    input.email?.trim() || `${input.asanaGid}@asana.pm-assistant.local`;

  // Try upsert; on conflict update email but keep existing role
  const { data, error } = await db
    .from("users")
    .upsert(
      { asana_user_id: input.asanaGid, email, role: "PM" },
      { onConflict: "asana_user_id" }
    )
    .select("id,role")
    .single();

  if (error || !data) {
    // Fallback: select if upsert fails
    const { data: existing } = await db
      .from("users")
      .select("id,role")
      .eq("asana_user_id", input.asanaGid)
      .maybeSingle();
    if (existing) {
      return { id: existing.id, role: existing.role as "Admin" | "PM" | "Viewer" };
    }
    throw new Error(
      `Nepodařilo se vytvořit uživatele z Asany. ${error?.message ?? ""}`.trim()
    );
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

export { ensureDb, tryGetDb };

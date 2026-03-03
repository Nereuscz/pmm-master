const ASANA_BASE = "https://app.asana.com/api/1.0";

export type AsanaTask = { gid: string; name: string };

export async function createTask(
  accessToken: string,
  projectGid: string,
  name: string,
  notes?: string
): Promise<AsanaTask> {
  const res = await fetch(`${ASANA_BASE}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        name,
        projects: [projectGid],
        notes: notes ?? undefined,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ??
        `Asana API: ${res.status}`
    );
  }

  const json = (await res.json()) as { data?: AsanaTask };
  if (!json.data?.gid) throw new Error("Asana API: neplatná odpověď");
  return json.data;
}

export async function createSubtask(
  accessToken: string,
  parentTaskGid: string,
  name: string,
  notes?: string
): Promise<AsanaTask> {
  const res = await fetch(`${ASANA_BASE}/tasks/${parentTaskGid}/subtasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        name,
        notes: notes ?? undefined,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ??
        `Asana API: ${res.status}`
    );
  }

  const json = (await res.json()) as { data?: AsanaTask };
  if (!json.data?.gid) throw new Error("Asana API: neplatná odpověď");
  return json.data;
}

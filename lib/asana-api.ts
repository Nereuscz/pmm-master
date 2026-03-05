const ASANA_BASE = "https://app.asana.com/api/1.0";

export type AsanaTask = { gid: string; name: string };

export type AsanaSection = { gid: string; name: string };

export type AsanaTaskFull = {
  gid: string;
  name: string;
  notes?: string;
  completed?: boolean;
  due_on?: string;
  assignee?: { gid: string; name?: string };
  custom_fields?: Array<{ gid: string; name?: string; display_value?: string }>;
  memberships?: Array<{ section?: { gid: string; name?: string } }>;
};

function asanaError(res: Response, err: unknown): Error {
  const parsed = err as { errors?: Array<{ message?: string }> };
  return new Error(
    parsed?.errors?.[0]?.message ?? `Asana API: ${res.status}`
  );
}

export async function getProjectSections(
  accessToken: string,
  projectGid: string
): Promise<AsanaSection[]> {
  const res = await fetch(
    `${ASANA_BASE}/projects/${projectGid}/sections?opt_fields=name`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw asanaError(res, err);
  }
  const json = (await res.json()) as { data?: AsanaSection[] };
  return json.data ?? [];
}

const TASK_OPT_FIELDS =
  "name,notes,completed,due_on,assignee.name,custom_fields.name,custom_fields.display_value,memberships.section.name";

export async function getTasksForProject(
  accessToken: string,
  projectGid: string,
  limit = 200
): Promise<AsanaTaskFull[]> {
  const tasks: AsanaTaskFull[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${ASANA_BASE}/projects/${projectGid}/tasks`);
    url.searchParams.set("opt_fields", TASK_OPT_FIELDS);
    url.searchParams.set("limit", String(Math.min(limit - tasks.length, 100)));
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw asanaError(res, err);
    }

    const json = (await res.json()) as {
      data?: AsanaTaskFull[];
      next_page?: { offset?: string };
    };
    const page = json.data ?? [];
    tasks.push(...page);
    offset = json.next_page?.offset;
  } while (offset && tasks.length < limit);

  return tasks;
}

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

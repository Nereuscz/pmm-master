import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionsMaybeSingleMock = vi.fn();
const exportJobsMaybeSingleMock = vi.fn();
const exportJobsInsertMock = vi.fn();
const requireProjectOwnershipMock = vi.fn();
const getValidAsanaTokenMock = vi.fn();
const createTaskMock = vi.fn();
const createSubtaskMock = vi.fn();
const fromMock = vi.fn((table: string) => {
  if (table === "sessions") {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: sessionsMaybeSingleMock,
        }),
      }),
    };
  }

  if (table === "export_jobs") {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: exportJobsMaybeSingleMock,
        }),
      }),
      insert: exportJobsInsertMock,
    };
  }

  throw new Error(`Unexpected table: ${table}`);
});

vi.mock("@/lib/db", () => ({
  ensureDb: () => ({ from: fromMock }),
  requireProjectOwnership: requireProjectOwnershipMock,
}));

vi.mock("@/lib/auth-guard", async () => {
  const { NextResponse } = await import("next/server");
  return {
    getAuthUser: vi.fn(async () => ({ id: "u1", role: "PM", email: "pm@example.com" })),
    unauthorized: () => NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    forbidden: () => NextResponse.json({ error: "forbidden" }, { status: 403 }),
    canProcess: () => true,
    isAdmin: () => false,
  };
});

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/asana-auth", () => ({ getValidAsanaToken: getValidAsanaTokenMock }));
vi.mock("@/lib/asana-api", () => ({
  createTask: createTaskMock,
  createSubtask: createSubtaskMock,
}));

describe("POST /api/asana/export", () => {
  beforeEach(() => {
    fromMock.mockClear();
    sessionsMaybeSingleMock.mockReset();
    exportJobsMaybeSingleMock.mockReset();
    exportJobsInsertMock.mockReset();
    requireProjectOwnershipMock.mockReset();
    getValidAsanaTokenMock.mockReset();
    createTaskMock.mockReset();
    createSubtaskMock.mockReset();
  });

  it("returns 409 and does not create an export job when user has no valid Asana token", async () => {
    sessionsMaybeSingleMock.mockResolvedValue({
      data: { id: "11111111-1111-1111-1111-111111111111", project_id: "p1" },
      error: null,
    });
    exportJobsMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    requireProjectOwnershipMock.mockResolvedValue({ ok: true, project: { id: "p1" } });
    getValidAsanaTokenMock.mockResolvedValue(null);

    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/asana/export", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "11111111-1111-1111-1111-111111111111",
        asanaProjectId: "asana-project-1",
        idempotencyKey: "export-key-123",
        title: "Export",
        sections: [{ question: "Q", answer: "A" }],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Asana není připojená nebo uživatel nemá platný token.");
    expect(exportJobsInsertMock).not.toHaveBeenCalled();
    expect(createTaskMock).not.toHaveBeenCalled();
    expect(createSubtaskMock).not.toHaveBeenCalled();
  });
});

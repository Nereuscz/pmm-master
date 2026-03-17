import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
const requireProjectOwnershipMock = vi.fn();

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
    isAdmin: () => false,
  };
});

vi.mock("@/lib/api-logger", () => ({ logApiError: vi.fn() }));

describe("PUT /api/guide/draft", () => {
  beforeEach(() => {
    fromMock.mockReset();
    requireProjectOwnershipMock.mockReset();
  });

  it("blocks saving a draft for a project the user does not own", async () => {
    requireProjectOwnershipMock.mockResolvedValue({
      ok: false,
      status: 404,
      message: "Projekt nebyl nalezen.",
    });

    const { PUT } = await import("./route");
    const req = new NextRequest("http://localhost/api/guide/draft", {
      method: "PUT",
      body: JSON.stringify({
        projectId: "11111111-1111-1111-1111-111111111111",
        phase: "Iniciace",
        framework: "Univerzální",
        answers: [],
        messages: [],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PUT(req);
    const body = await res.json();

    expect(requireProjectOwnershipMock).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      "u1",
      false
    );
    expect(res.status).toBe(404);
    expect(body.error).toBe("Projekt nebyl nalezen.");
    expect(fromMock).not.toHaveBeenCalled();
  });
});

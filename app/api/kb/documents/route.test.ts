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
    canReadKb: () => true,
    canManageKb: () => true,
    isAdmin: () => false,
  };
});

describe("GET /api/kb/documents", () => {
  beforeEach(() => {
    fromMock.mockReset();
    requireProjectOwnershipMock.mockReset();
  });

  it("returns 400 for invalid projectId query param", async () => {
    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/kb/documents?projectId=not-a-uuid");

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Neplatný projectId.");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns 404 when user does not own the requested project documents", async () => {
    requireProjectOwnershipMock.mockResolvedValue({
      ok: false,
      status: 404,
      message: "Projekt nebyl nalezen.",
    });

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/kb/documents?projectId=5f8a1b8b-5f50-4b42-93b6-4fdac0a2e61e");

    const res = await GET(req);
    const body = await res.json();

    expect(requireProjectOwnershipMock).toHaveBeenCalledWith(
      "5f8a1b8b-5f50-4b42-93b6-4fdac0a2e61e",
      "u1",
      false
    );
    expect(res.status).toBe(404);
    expect(body.error).toBe("Projekt nebyl nalezen.");
    expect(fromMock).not.toHaveBeenCalled();
  });
});

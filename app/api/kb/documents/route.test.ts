import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/db", () => ({
  ensureDb: () => ({ from: fromMock })
}));

vi.mock("@/lib/auth-guard", async () => {
  const { NextResponse } = await import("next/server");
  return {
    getAuthUser: vi.fn(async () => ({ id: "u1", role: "PM", email: "pm@example.com" })),
    unauthorized: () => NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    forbidden: () => NextResponse.json({ error: "forbidden" }, { status: 403 }),
    canReadKb: () => true,
    canManageKb: () => true,
  };
});

describe("GET /api/kb/documents", () => {
  it("returns 400 for invalid projectId query param", async () => {
    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/kb/documents?projectId=not-a-uuid");

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Neplatný projectId.");
    expect(fromMock).not.toHaveBeenCalled();
  });
});

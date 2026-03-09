import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const generateStructuredOutputMock = vi.fn();
const retrieveTopChunksMock = vi.fn();
const searchMarketMock = vi.fn();
const getAsanaSnapshotMock = vi.fn();
const getOrCreateProjectContextMock = vi.fn();

vi.mock("@/lib/guide", () => ({
  getQuestionsForPhase: () => [{ id: "q1", text: "Otázka", hint: "Nápověda" }]
}));

vi.mock("@/lib/anthropic", () => ({
  generateStructuredOutput: generateStructuredOutputMock
}));

vi.mock("@/lib/rag", () => ({
  retrieveTopChunks: retrieveTopChunksMock
}));

vi.mock("@/lib/db", () => ({
  tryGetDb: () => ({}),
  requireProjectOwnership: vi.fn(async () => ({ ok: false, status: 403 })),
  getOrCreateProjectContext: getOrCreateProjectContextMock
}));

vi.mock("@/lib/auth-guard", async () => {
  const { NextResponse } = await import("next/server");
  return {
    getAuthUser: vi.fn(async () => ({ id: "u1", role: "PM", email: "pm@example.com" })),
    unauthorized: () => NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    forbidden: () => NextResponse.json({ error: "forbidden" }, { status: 403 }),
    canProcess: () => true,
    isAdmin: () => false
  };
});

vi.mock("@/lib/api-logger", () => ({ logApiError: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkAiRateLimit: vi.fn(async () => ({ success: true })) }));
vi.mock("@/lib/tavily", () => ({
  searchMarket: searchMarketMock,
  buildQueryFromAnswers: () => "query"
}));
vi.mock("@/lib/asana-sync", () => ({ getAsanaSnapshotForProject: getAsanaSnapshotMock }));
vi.mock("@/lib/text", () => ({
  extractContextSummary: vi.fn(),
  buildContextBlock: vi.fn(),
  mergeContextBlocks: vi.fn()
}));

describe("POST /api/guide/next", () => {
  it("blocks unauthorized project before expensive AI/RAG calls", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/guide/next", {
      method: "POST",
      body: JSON.stringify({
        projectId: "11111111-1111-1111-1111-111111111111",
        phase: "Iniciace",
        framework: "Univerzální",
        answers: [{ questionId: "q1", question: "Otázka", answer: "Odpověď" }]
      }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("forbidden");
    expect(generateStructuredOutputMock).not.toHaveBeenCalled();
    expect(retrieveTopChunksMock).not.toHaveBeenCalled();
    expect(searchMarketMock).not.toHaveBeenCalled();
    expect(getAsanaSnapshotMock).not.toHaveBeenCalled();
    expect(getOrCreateProjectContextMock).not.toHaveBeenCalled();
  });
});

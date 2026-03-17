import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("./auth", () => ({
  authOptions: {},
}));

const originalDevAuthBypass = process.env.DEV_AUTH_BYPASS;

describe("getAuthUser", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
    delete process.env.DEV_AUTH_BYPASS;
  });

  afterEach(() => {
    if (originalDevAuthBypass === undefined) {
      delete process.env.DEV_AUTH_BYPASS;
      return;
    }
    process.env.DEV_AUTH_BYPASS = originalDevAuthBypass;
  });

  it("returns null when session is missing and bypass is disabled", async () => {
    getServerSessionMock.mockResolvedValue(null);

    const { getAuthUser } = await import("./auth-guard");

    await expect(getAuthUser()).resolves.toBeNull();
  });

  it("returns a dev admin only when explicit bypass is enabled", async () => {
    process.env.DEV_AUTH_BYPASS = "true";
    getServerSessionMock.mockResolvedValue(null);

    const { getAuthUser } = await import("./auth-guard");

    await expect(getAuthUser()).resolves.toEqual({
      id: "dev-user",
      role: "Admin",
      email: "dev@localhost",
      name: "Dev User",
    });
  });
});

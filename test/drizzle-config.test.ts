import { afterEach, describe, expect, it, vi } from "vitest";

describe("drizzle config", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("node:fs");
  });

  it("creates the sqlite data directory before exporting config", async () => {
    const mkdirSync = vi.fn();
    vi.doMock("node:fs", () => ({
      default: {
        mkdirSync,
      },
    }));

    const { default: config } = await import("../drizzle.config.ts");

    expect(mkdirSync).toHaveBeenCalledWith("data", { recursive: true });
    expect(config.dbCredentials.url).toBe("data/sqlite.db");
  });
});

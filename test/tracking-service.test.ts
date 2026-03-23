import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadService(resultRows: unknown[][]) {
  const updateWhere = vi.fn(async () => undefined);
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => resultRows.shift() ?? []),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: updateWhere,
      })),
    })),
  };

  vi.doMock("../src/db/index.js", () => ({ db }));
  vi.doMock("../src/db/schema.js", () => ({ tickets: { id: "id", worktreePath: "worktreePath" } }));
  vi.doMock("drizzle-orm", () => ({ eq: vi.fn(() => "eq") }));

  const mod = await import("../src/services/tracking-service.ts");
  return { mod, db, updateWhere };
}

describe("tracking service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(1234);
  });

  it("returns 404 when no ticket matches the cwd", async () => {
    const { mod } = await loadService([[]]);

    await expect(mod.applyTrackingState("/repo/app", "In Progress")).resolves.toEqual({
      success: false,
      error: "No ticket found for this directory",
      status: 404,
    });
  });

  it("returns 409 when a manual override is active", async () => {
    const { mod } = await loadService([[{ id: "ticket-1", statusOverride: true }]]);

    await expect(mod.applyTrackingState("/repo/app", "In Progress")).resolves.toEqual({
      success: false,
      error: "Ticket has manual status override",
      ticketId: "ticket-1",
      status: 409,
    });
  });

  it("updates the ticket column and last activity when tracking succeeds", async () => {
    const { mod, db } = await loadService([
      [{ id: "ticket-1", title: "Task", statusOverride: false }],
    ]);

    await expect(mod.applyTrackingState("/repo/app", "In Progress")).resolves.toEqual({
      success: true,
      ticketId: "ticket-1",
      title: "Task",
    });

    const set = db.update.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(set).toHaveBeenCalledWith({ column: "In Progress", lastActivityAt: 1234 });
  });
});

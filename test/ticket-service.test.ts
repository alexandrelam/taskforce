import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadService(selectResults: unknown[][]) {
  const removeWorktree = vi.fn(() => ({ success: true, error: null }));
  const killSetupTmuxSession = vi.fn();
  const killTmuxSession = vi.fn();
  const warn = vi.fn();
  const deleteWhere = vi.fn(async () => undefined);
  const updateWhere = vi.fn(async () => undefined);

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => selectResults.shift() ?? []),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: deleteWhere,
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: updateWhere,
      })),
    })),
  };

  vi.doMock("../src/db/index.js", () => ({ db }));
  vi.doMock("../src/db/schema.js", () => ({
    tickets: { id: "id" },
    projects: { id: "id" },
  }));
  vi.doMock("drizzle-orm", () => ({ eq: vi.fn(() => "eq") }));
  vi.doMock("../src/worktree.js", () => ({ removeWorktree, killSetupTmuxSession }));
  vi.doMock("../src/pty.js", () => ({ killTmuxSession }));
  vi.doMock("../src/services/logger.js", () => ({ logger: { warn } }));

  const mod = await import("../src/services/ticket-service.ts");
  return {
    mod,
    removeWorktree,
    killSetupTmuxSession,
    killTmuxSession,
    warn,
    deleteWhere,
    updateWhere,
    db,
  };
}

describe("ticket service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects deleting missing tickets", async () => {
    const { mod } = await loadService([[]]);
    await expect(mod.deleteTicketAndCleanup("missing")).resolves.toEqual({
      success: false,
      error: "Ticket not found",
      status: 404,
    });
  });

  it("rejects deleting the main ticket", async () => {
    const { mod } = await loadService([
      [
        {
          id: "ticket-1",
          isMain: true,
          worktreePath: null,
          projectId: "project-1",
          setupTmuxSession: null,
        },
      ],
    ]);

    await expect(mod.deleteTicketAndCleanup("ticket-1")).resolves.toEqual({
      success: false,
      error: "Cannot delete main ticket",
      status: 403,
    });
  });

  it("cleans up worktrees and tmux sessions when deleting tickets", async () => {
    const { mod, removeWorktree, killSetupTmuxSession, killTmuxSession, deleteWhere } =
      await loadService([
        [
          {
            id: "ticket-1",
            isMain: false,
            worktreePath: "/repo/app-ticket",
            projectId: "project-1",
            setupTmuxSession: "ticket-1-setup",
          },
        ],
        [{ id: "project-1", path: "/repo/app" }],
      ]);

    await expect(mod.deleteTicketAndCleanup("ticket-1")).resolves.toEqual({ success: true });

    expect(removeWorktree).toHaveBeenCalledWith("/repo/app", "/repo/app-ticket");
    expect(killSetupTmuxSession).toHaveBeenCalledWith("ticket-1-setup");
    expect(killTmuxSession).toHaveBeenCalledWith("ticket-1");
    expect(deleteWhere).toHaveBeenCalled();
  });

  it("warns when worktree removal fails but still deletes the ticket", async () => {
    const { mod, removeWorktree, warn } = await loadService([
      [
        {
          id: "ticket-1",
          isMain: false,
          worktreePath: "/repo/app-ticket",
          projectId: "project-1",
          setupTmuxSession: null,
        },
      ],
      [{ id: "project-1", path: "/repo/app" }],
    ]);
    removeWorktree.mockReturnValue({ success: false, error: "locked" });

    await expect(mod.deleteTicketAndCleanup("ticket-1")).resolves.toEqual({ success: true });
    expect(warn).toHaveBeenCalledWith("Failed to remove worktree for ticket ticket-1: locked");
  });

  it("clears manual overrides through updateTicket", async () => {
    const { mod, db } = await loadService([]);

    await mod.clearTicketOverride("ticket-1");

    const set = db.update.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(set).toHaveBeenCalledWith({ statusOverride: false });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

function createDbMock(updateCalls: Array<Record<string, unknown>>) {
  return {
    update: vi.fn(() => ({
      set: vi.fn((payload: Record<string, unknown>) => ({
        where: vi.fn(async () => {
          updateCalls.push(payload);
        }),
      })),
    })),
  };
}

async function loadService() {
  const updateCalls: Array<Record<string, unknown>> = [];
  const db = createDbMock(updateCalls);
  const worktree = {
    captureTmuxOutput: vi.fn(() => "setup output"),
    createWorktree: vi.fn(),
    createWorktreeFromBranch: vi.fn(),
    getTmuxSessionStatus: vi.fn(() => ({ running: false, exitCode: 0 })),
    isTmuxAvailable: vi.fn(() => false),
    killSetupTmuxSession: vi.fn(),
    runPostWorktreeCommand: vi.fn(() => ({ output: "installed", error: null })),
    slugify: vi.fn((title: string) => title.toLowerCase().replace(/\s+/g, "-")),
    spawnTmuxCommand: vi.fn(() => ({ success: true, error: null })),
  };

  vi.doMock("../src/db/index.js", () => ({ db }));
  vi.doMock("../src/db/schema.js", () => ({ tickets: { id: "id" } }));
  vi.doMock("drizzle-orm", () => ({ eq: vi.fn(() => "eq") }));
  vi.doMock("../src/worktree.js", () => worktree);

  const mod = await import("../src/services/ticket-setup-service.ts");
  return { mod, db, updateCalls, worktree };
}

describe("ticket setup service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("wraps ticket setup with a slugified title", async () => {
    const { mod, worktree } = await loadService();
    worktree.createWorktree.mockReturnValue({ worktreePath: "/repo/app-ticket", error: null });

    const plan = mod.createTicketWorktree("/repo/app", "Ship Feature Now", "main");
    expect(plan.create()).toEqual({ worktreePath: "/repo/app-ticket", error: null });
    expect(worktree.slugify).toHaveBeenCalledWith("Ship Feature Now");
    expect(worktree.createWorktree).toHaveBeenCalledWith("/repo/app", "ship-feature-now", "main");
  });

  it("marks the setup as failed when worktree creation fails", async () => {
    const { mod, updateCalls } = await loadService();

    await mod.runTicketSetup(
      "ticket-1",
      () => ({ worktreePath: null, error: "branch missing" }),
      null
    );

    expect(updateCalls).toEqual([
      { setupStatus: "creating_worktree" },
      { setupStatus: "failed", setupError: "branch missing" },
    ]);
  });

  it("marks the setup ready when there is no post-worktree command", async () => {
    const { mod, updateCalls } = await loadService();

    await mod.runTicketSetup(
      "ticket-1",
      () => ({ worktreePath: "/repo/app-ticket", error: null }),
      null
    );

    expect(updateCalls).toEqual([
      { setupStatus: "creating_worktree" },
      { worktreePath: "/repo/app-ticket" },
      { setupStatus: "ready" },
    ]);
  });

  it("falls back to the synchronous post command when tmux is unavailable", async () => {
    const { mod, updateCalls, worktree } = await loadService();
    worktree.isTmuxAvailable.mockReturnValue(false);

    await mod.runTicketSetup(
      "ticket-1",
      () => ({ worktreePath: "/repo/app-ticket", error: null }),
      "npm install"
    );

    expect(worktree.runPostWorktreeCommand).toHaveBeenCalledWith("/repo/app-ticket", "npm install");
    expect(updateCalls).toEqual([
      { setupStatus: "creating_worktree" },
      { worktreePath: "/repo/app-ticket" },
      { setupStatus: "running_post_command" },
      { setupStatus: "ready", setupLogs: "installed" },
    ]);
  });

  it("falls back to the synchronous post command when tmux spawn fails", async () => {
    const { mod, updateCalls, worktree } = await loadService();
    worktree.isTmuxAvailable.mockReturnValue(true);
    worktree.spawnTmuxCommand.mockReturnValue({ success: false, error: "tmux failed" });

    await mod.runTicketSetup(
      "ticket-1",
      () => ({ worktreePath: "/repo/app-ticket", error: null }),
      "npm install"
    );

    expect(worktree.spawnTmuxCommand).toHaveBeenCalledWith(
      "ticket-1-setup",
      "/repo/app-ticket",
      "npm install"
    );
    expect(updateCalls).toEqual([
      { setupStatus: "creating_worktree" },
      { worktreePath: "/repo/app-ticket" },
      { setupStatus: "running_post_command" },
      { setupStatus: "ready", setupLogs: "installed" },
    ]);
  });

  it("monitors a tmux session until it finishes successfully", async () => {
    vi.useFakeTimers();
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const { mod, updateCalls, worktree } = await loadService();
    worktree.isTmuxAvailable.mockReturnValue(true);
    worktree.spawnTmuxCommand.mockReturnValue({ success: true, error: null });
    worktree.getTmuxSessionStatus.mockReturnValue({ running: false, exitCode: 0 });

    await mod.runTicketSetup(
      "ticket-1",
      () => ({ worktreePath: "/repo/app-ticket", error: null }),
      "npm install"
    );
    await vi.runOnlyPendingTimersAsync();

    expect(timeoutSpy).toHaveBeenCalled();
    expect(worktree.killSetupTmuxSession).toHaveBeenCalledWith("ticket-1-setup");
    expect(updateCalls).toEqual([
      { setupStatus: "creating_worktree" },
      { worktreePath: "/repo/app-ticket" },
      { setupStatus: "running_post_command", setupTmuxSession: "ticket-1-setup" },
      { setupStatus: "ready", setupLogs: "setup output", setupTmuxSession: null },
    ]);
  });

  it("stores thrown errors as failed setup state", async () => {
    const { mod, updateCalls } = await loadService();

    await mod.runTicketSetup(
      "ticket-1",
      () => {
        throw new Error("boom");
      },
      null
    );

    expect(updateCalls).toEqual([
      { setupStatus: "creating_worktree" },
      { setupStatus: "failed", setupError: "boom" },
    ]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadService() {
  const spawn = vi.fn();
  const unref = vi.fn();
  const getProjectById = vi.fn();
  const getTicketById = vi.fn();

  spawn.mockReturnValue({ unref });

  vi.doMock("child_process", () => ({ spawn }));
  vi.doMock("../src/services/ticket-service.js", () => ({
    getProjectById,
    getTicketById,
  }));

  const mod = await import("../src/services/editor-service.ts");
  return { mod, spawn, unref, getProjectById, getTicketById };
}

describe("editor service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 404 when the ticket is missing", async () => {
    const { mod, getTicketById } = await loadService();
    getTicketById.mockResolvedValue(null);

    await expect(mod.openEditorForTicket("ticket-1")).resolves.toEqual({
      success: false,
      error: "Ticket not found",
      status: 404,
    });
  });

  it("rejects missing editor configuration and unknown editors", async () => {
    const missingEditor = await loadService();
    missingEditor.getTicketById.mockResolvedValue({ id: "ticket-1", projectId: "project-1" });
    missingEditor.getProjectById.mockResolvedValue({
      id: "project-1",
      path: "/repo/app",
      editor: null,
    });

    await expect(missingEditor.mod.openEditorForTicket("ticket-1")).resolves.toEqual({
      success: false,
      error: "No editor configured for this project",
      status: 400,
    });

    vi.resetModules();
    const unknownEditor = await loadService();
    unknownEditor.getTicketById.mockResolvedValue({ id: "ticket-1", projectId: "project-1" });
    unknownEditor.getProjectById.mockResolvedValue({
      id: "project-1",
      path: "/repo/app",
      editor: "unknown",
    });

    await expect(unknownEditor.mod.openEditorForTicket("ticket-1")).resolves.toEqual({
      success: false,
      error: "Unknown editor: unknown",
      status: 400,
    });
  });

  it("uses the project path for main tickets and worktree path for branch tickets", async () => {
    const mainTicket = await loadService();
    mainTicket.getTicketById.mockResolvedValue({
      id: "ticket-1",
      projectId: "project-1",
      isMain: true,
      worktreePath: "/repo/app-ticket",
    });
    mainTicket.getProjectById.mockResolvedValue({
      id: "project-1",
      path: "/repo/app",
      editor: "cursor",
    });

    await expect(mainTicket.mod.openEditorForTicket("ticket-1")).resolves.toEqual({
      success: true,
    });
    expect(mainTicket.spawn).toHaveBeenCalledWith("cursor", ["/repo/app"], {
      detached: true,
      stdio: "ignore",
    });

    vi.resetModules();
    const branchTicket = await loadService();
    branchTicket.getTicketById.mockResolvedValue({
      id: "ticket-2",
      projectId: "project-1",
      isMain: false,
      worktreePath: "/repo/app-ticket",
    });
    branchTicket.getProjectById.mockResolvedValue({
      id: "project-1",
      path: "/repo/app",
      editor: "vscode",
    });

    await expect(branchTicket.mod.openEditorForTicket("ticket-2")).resolves.toEqual({
      success: true,
    });
    expect(branchTicket.spawn).toHaveBeenCalledWith("code", ["/repo/app-ticket"], {
      detached: true,
      stdio: "ignore",
    });
  });

  it("returns a launch error when spawning the editor fails", async () => {
    const { mod, getProjectById, getTicketById, spawn } = await loadService();
    getTicketById.mockResolvedValue({
      id: "ticket-1",
      projectId: "project-1",
      isMain: false,
      worktreePath: "/repo/app-ticket",
    });
    getProjectById.mockResolvedValue({
      id: "project-1",
      path: "/repo/app",
      editor: "cursor",
    });
    spawn.mockImplementation(() => {
      throw new Error("spawn failed");
    });

    await expect(mod.openEditorForTicket("ticket-1")).resolves.toEqual({
      success: false,
      error: "Failed to launch editor: spawn failed",
      status: 500,
    });
  });
});

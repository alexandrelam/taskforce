import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";

type TicketServiceMocks = {
  clearTicketOverride: ReturnType<typeof vi.fn>;
  createTicketRecord: ReturnType<typeof vi.fn>;
  deleteTicketAndCleanup: ReturnType<typeof vi.fn>;
  getProjectById: ReturnType<typeof vi.fn>;
  getTicketById: ReturnType<typeof vi.fn>;
  listTickets: ReturnType<typeof vi.fn>;
  toTicketResponse: ReturnType<typeof vi.fn>;
  updateTicket: ReturnType<typeof vi.fn>;
};

type TicketSetupMocks = {
  createBranchWorktree: ReturnType<typeof vi.fn>;
  createTicketWorktree: ReturnType<typeof vi.fn>;
  runTicketSetup: ReturnType<typeof vi.fn>;
};

type ServerContext = {
  close: () => Promise<void>;
  fetchJson: (path: string, init?: RequestInit) => Promise<Response>;
  logger: { error: ReturnType<typeof vi.fn> };
  setupService: TicketSetupMocks;
  ticketService: TicketServiceMocks;
};

async function createServer(): Promise<ServerContext> {
  const ticketService: TicketServiceMocks = {
    clearTicketOverride: vi.fn(),
    createTicketRecord: vi.fn(),
    deleteTicketAndCleanup: vi.fn(),
    getProjectById: vi.fn(),
    getTicketById: vi.fn(),
    listTickets: vi.fn(),
    toTicketResponse: vi.fn((ticket) => ticket),
    updateTicket: vi.fn(),
  };
  const setupService: TicketSetupMocks = {
    createBranchWorktree: vi.fn(() => ({ create: vi.fn() })),
    createTicketWorktree: vi.fn(() => ({ create: vi.fn() })),
    runTicketSetup: vi.fn(() => Promise.resolve()),
  };
  const openEditorForTicket = vi.fn();
  const execFileSync = vi.fn();
  const logger = { error: vi.fn() };

  vi.doMock("../src/services/ticket-service.js", () => ticketService);
  vi.doMock("../src/services/ticket-setup-service.js", () => setupService);
  vi.doMock("../src/services/editor-service.js", () => ({ openEditorForTicket }));
  vi.doMock("child_process", () => ({ execFileSync }));
  vi.doMock("../src/services/logger.js", () => ({ logger }));

  const express = (await import("express")).default;
  const { default: router } = await import("../src/routes/tickets.ts");

  const app = express();
  app.use(express.json());
  app.use("/api/tickets", router);

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
    fetchJson: (path, init) => fetch(`${baseUrl}${path}`, init),
    logger,
    setupService,
    ticketService,
  };
}

describe("tickets routes", () => {
  let context: ServerContext | null = null;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("crypto", {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce("ticket-1")
        .mockReturnValueOnce("ticket-2")
        .mockReturnValueOnce("ticket-3"),
    });
    vi.spyOn(Date, "now").mockReturnValue(1234);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (context) {
      await context.close();
      context = null;
    }
  });

  it("lists tickets and maps them through the response transformer", async () => {
    context = await createServer();
    context.ticketService.listTickets.mockResolvedValue([{ id: "a" }]);
    context.ticketService.toTicketResponse.mockReturnValue({ id: "mapped-a" });

    const response = await context.fetchJson("/api/tickets?projectId=project-1");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([{ id: "mapped-a" }]);
    expect(context.ticketService.listTickets).toHaveBeenCalledWith("project-1");
    expect(context.ticketService.toTicketResponse.mock.calls[0]?.[0]).toEqual({ id: "a" });
  });

  it("creates a ticket and starts background setup when worktrees are enabled", async () => {
    context = await createServer();
    const create = vi.fn(() => ({ worktreePath: "/repo/app-ticket", error: null }));
    context.ticketService.getProjectById.mockResolvedValue({
      id: "project-1",
      path: "/repo/app",
      postWorktreeCommand: "npm install",
      useWorktrees: true,
    });
    context.setupService.createTicketWorktree.mockReturnValue({ create });

    const response = await context.fetchJson("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Ship Feature",
        projectId: "project-1",
        description: "desc",
        prLink: "https://github.com/acme/app/pull/1",
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "ticket-1",
      title: "Ship Feature",
      column: "To Do",
      createdAt: 1234,
      projectId: "project-1",
      worktreePath: null,
      isMain: false,
      setupStatus: "pending",
      setupError: null,
      setupLogs: null,
      description: "desc",
      prLink: "https://github.com/acme/app/pull/1",
    });
    expect(context.setupService.createTicketWorktree).toHaveBeenCalledWith(
      "/repo/app",
      "Ship Feature",
      undefined
    );
    expect(context.ticketService.createTicketRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ticket-1",
        title: "Ship Feature",
        setupStatus: "pending",
      })
    );
    expect(context.setupService.runTicketSetup).toHaveBeenCalledWith(
      "ticket-1",
      create,
      "npm install"
    );
  });

  it("creates a ready ticket without setup when worktrees are disabled", async () => {
    context = await createServer();
    context.ticketService.getProjectById.mockResolvedValue({
      id: "project-1",
      path: "/repo/app",
      postWorktreeCommand: "npm install",
      useWorktrees: false,
    });

    const response = await context.fetchJson("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Plain Task", projectId: "project-1" }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: "ticket-1",
        title: "Plain Task",
        setupStatus: "ready",
      })
    );
    expect(context.setupService.createTicketWorktree).not.toHaveBeenCalled();
    expect(context.setupService.runTicketSetup).not.toHaveBeenCalled();
  });

  it("validates required fields when creating from a branch", async () => {
    context = await createServer();

    const response = await context.fetchJson("/api/tickets/from-branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "project-1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "branchName and projectId are required",
    });
  });

  it("creates tickets from an existing branch and skips post command when requested", async () => {
    context = await createServer();
    const create = vi.fn(() => ({ worktreePath: "/repo/app-feature", error: null }));
    context.ticketService.getProjectById.mockResolvedValue({
      id: "project-1",
      path: "/repo/app",
      postWorktreeCommand: "npm install",
      useWorktrees: true,
    });
    context.setupService.createBranchWorktree.mockReturnValue({ create });

    const response = await context.fetchJson("/api/tickets/from-branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchName: "feature-x",
        projectId: "project-1",
        runPostCommand: false,
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: "ticket-1",
        title: "feature-x",
        setupStatus: "pending",
      })
    );
    expect(context.setupService.createBranchWorktree).toHaveBeenCalledWith(
      "/repo/app",
      "feature-x"
    );
    expect(context.setupService.runTicketSetup).toHaveBeenCalledWith("ticket-1", create, null);
  });

  it("returns 404 when creating from a branch for an unknown project", async () => {
    context = await createServer();
    context.ticketService.getProjectById.mockResolvedValue(null);

    const response = await context.fetchJson("/api/tickets/from-branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchName: "feature-x", projectId: "project-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Project not found",
    });
  });

  it("marks manual column changes as overrides when patching tickets", async () => {
    context = await createServer();
    context.ticketService.getTicketById.mockResolvedValue({ id: "ticket-1" });

    const response = await context.fetchJson("/api/tickets/ticket-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column: "Done", description: "updated", prLink: null }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(context.ticketService.updateTicket).toHaveBeenCalledWith("ticket-1", {
      column: "Done",
      description: "updated",
      prLink: null,
      statusOverride: true,
    });
  });

  it("returns 404 when patching a missing ticket", async () => {
    context = await createServer();
    context.ticketService.getTicketById.mockResolvedValue(null);

    const response = await context.fetchJson("/api/tickets/missing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "updated" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Ticket not found",
    });
  });

  it("clears overrides for existing tickets", async () => {
    context = await createServer();
    context.ticketService.getTicketById.mockResolvedValue({ id: "ticket-1" });

    const response = await context.fetchJson("/api/tickets/ticket-1/clear-override", {
      method: "PATCH",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(context.ticketService.clearTicketOverride).toHaveBeenCalledWith("ticket-1");
  });

  it("propagates delete errors with their status code", async () => {
    context = await createServer();
    context.ticketService.deleteTicketAndCleanup.mockResolvedValue({
      success: false,
      error: "Cannot delete main ticket",
      status: 403,
    });

    const response = await context.fetchJson("/api/tickets/ticket-1", {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Cannot delete main ticket",
    });
  });

  it("forwards open-editor results", async () => {
    context = await createServer();
    const editorModule = await import("../src/services/editor-service.js");
    vi.mocked(editorModule.openEditorForTicket).mockResolvedValue({ success: true });

    const response = await context.fetchJson("/api/tickets/ticket-1/open-editor", {
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("validates PR URLs before calling gh", async () => {
    context = await createServer();

    const response = await context.fetchJson("/api/tickets/pr-info?url=not-a-pr");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid GitHub PR URL" });
  });

  it("returns PR info from gh and surfaces gh failures", async () => {
    context = await createServer();
    const childProcess = await import("child_process");
    vi.mocked(childProcess.execFileSync)
      .mockReturnValueOnce('{"title":"Fix bug","headRefName":"feature-x"}')
      .mockImplementationOnce(() => {
        throw new Error("gh failed");
      });

    const success = await context.fetchJson(
      "/api/tickets/pr-info?url=https://github.com/acme/app/pull/42"
    );
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({
      title: "Fix bug",
      headRefName: "feature-x",
    });

    const failure = await context.fetchJson(
      "/api/tickets/pr-info?url=https://github.com/acme/app/pull/42"
    );
    expect(failure.status).toBe(500);
    await expect(failure.json()).resolves.toEqual({ error: "gh failed" });
  });
});

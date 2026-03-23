import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";

type DbMock = {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

type ServerContext = {
  close: () => Promise<void>;
  db: DbMock;
  fetchJson: (path: string, init?: RequestInit) => Promise<Response>;
  killTmuxSession: ReturnType<typeof vi.fn>;
  removeWorktree: ReturnType<typeof vi.fn>;
};

async function createServer(): Promise<ServerContext> {
  const deleteWhere = vi.fn(async () => undefined);
  const updateWhere = vi.fn(async () => undefined);
  const insertValues = vi.fn(async () => undefined);
  const selectFrom = vi.fn();
  const selectWhere = vi.fn();
  const selectLimit = vi.fn();
  const selectAll = vi.fn();

  const db: DbMock = {
    insert: vi.fn(() => ({
      values: insertValues,
    })),
    select: vi.fn(() => ({
      from: selectFrom,
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: updateWhere,
      })),
    })),
    delete: vi.fn(() => ({
      where: deleteWhere,
    })),
  };

  selectFrom.mockImplementation(() => ({
    where: selectWhere,
    all: selectAll,
  }));
  selectWhere.mockImplementation(() => ({
    limit: selectLimit,
  }));

  const killTmuxSession = vi.fn();
  const removeWorktree = vi.fn(() => ({ success: true, error: null }));

  vi.doMock("../src/db/index.js", () => ({ db }));
  vi.doMock("../src/db/schema.js", () => ({
    projects: { id: "projects.id", key: "projects.key" },
    tickets: { id: "tickets.id", projectId: "tickets.projectId", prLink: "tickets.prLink" },
  }));
  vi.doMock("drizzle-orm", () => ({ eq: vi.fn(() => "eq") }));
  vi.doMock("../src/pty.js", () => ({ killTmuxSession }));
  vi.doMock("../src/worktree.js", () => ({ removeWorktree }));
  vi.doMock("child_process", () => ({
    execFileSync: vi.fn(),
    execSync: vi.fn(),
  }));

  const express = (await import("express")).default;
  const { default: router } = await import("../src/routes/projects.ts");

  const app = express();
  app.use(express.json());
  app.use("/api/projects", router);

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
    db,
    fetchJson: (path, init) => fetch(`${baseUrl}${path}`, init),
    killTmuxSession,
    removeWorktree,
  };
}

describe("projects routes", () => {
  let context: ServerContext | null = null;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn().mockReturnValueOnce("project-1").mockReturnValueOnce("main-ticket"),
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

  it("creates a project and its main ticket", async () => {
    context = await createServer();

    const response = await context.fetchJson("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "App",
        path: "/repo/app",
        panes: [{ name: "shell" }],
        editor: "cursor",
        useWorktrees: false,
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "project-1",
      name: "App",
      path: "/repo/app",
      createdAt: 1234,
      postWorktreeCommand: null,
      panes: [{ name: "shell" }],
      editor: "cursor",
      useWorktrees: false,
    });
    expect(context.db.insert).toHaveBeenCalledTimes(2);
  });

  it("deletes project tickets, tmux sessions, and worktrees", async () => {
    context = await createServer();
    const projectRecord = [{ id: "project-1", path: "/repo/app" }];
    const ticketRecords = [
      { id: "main-ticket", worktreePath: null },
      { id: "ticket-2", worktreePath: "/repo/app-ticket-2" },
    ];
    context.db.select
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => projectRecord),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => ticketRecords),
        })),
      }));

    const response = await context.fetchJson("/api/projects/project-1", {
      method: "DELETE",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(context.killTmuxSession).toHaveBeenCalledWith("main-ticket");
    expect(context.killTmuxSession).toHaveBeenCalledWith("ticket-2");
    expect(context.removeWorktree).toHaveBeenCalledWith("/repo/app", "/repo/app-ticket-2");
    expect(context.db.delete).toHaveBeenCalledTimes(2);
  });

  it("normalizes empty patch values to null", async () => {
    context = await createServer();

    const response = await context.fetchJson("/api/projects/project-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postWorktreeCommand: "", editor: "", panes: [], useWorktrees: true }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(context.db.update).toHaveBeenCalled();
  });

  it("returns parsed commit information", async () => {
    context = await createServer();
    (context.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ id: "project-1", path: "/repo/app" }]),
        })),
      })),
    }));
    const childProcess = await import("child_process");
    vi.mocked(childProcess.execSync).mockReturnValue("abc123 Fix bug");

    const response = await context.fetchJson("/api/projects/project-1/commit");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ hash: "abc123", message: "Fix bug" });
  });

  it("returns 404 for commit lookup when the project is missing", async () => {
    context = await createServer();
    (context.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    }));

    const response = await context.fetchJson("/api/projects/project-1/commit");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Project not found" });
  });

  it("returns pull output and pull failures", async () => {
    context = await createServer();
    (context.db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ id: "project-1", path: "/repo/app" }]),
        })),
      })),
    }));
    const childProcess = await import("child_process");
    vi.mocked(childProcess.execSync)
      .mockReturnValueOnce("Already up to date.")
      .mockImplementationOnce(() => {
        throw new Error("merge conflict");
      });

    const success = await context.fetchJson("/api/projects/project-1/pull", { method: "POST" });
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({
      success: true,
      output: "Already up to date.",
    });

    const failure = await context.fetchJson("/api/projects/project-1/pull", { method: "POST" });
    expect(failure.status).toBe(500);
    await expect(failure.json()).resolves.toEqual({
      success: false,
      error: "merge conflict",
    });
  });

  it("filters PR suggestions to recent non-duplicated PRs", async () => {
    context = await createServer();
    vi.setSystemTime(new Date("2026-03-23T10:00:00Z"));
    (context.db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ id: "project-1", path: "/repo/app" }]),
        })),
      })),
    }));
    (context.db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ prLink: "https://github.com/acme/app/pull/2" }]),
      })),
    }));
    const childProcess = await import("child_process");
    vi.mocked(childProcess.execFileSync).mockReturnValue(
      Buffer.from(
        JSON.stringify([
          {
            title: "Recent PR",
            url: "https://github.com/acme/app/pull/1",
            headRefName: "feature-1",
            number: 1,
            createdAt: "2026-03-22T10:00:00Z",
          },
          {
            title: "Existing PR",
            url: "https://github.com/acme/app/pull/2",
            headRefName: "feature-2",
            number: 2,
            createdAt: "2026-03-22T10:00:00Z",
          },
          {
            title: "Old PR",
            url: "https://github.com/acme/app/pull/3",
            headRefName: "feature-3",
            number: 3,
            createdAt: "2026-03-01T10:00:00Z",
          },
        ])
      )
    );

    const response = await context.fetchJson("/api/projects/project-1/pr-suggestions");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        title: "Recent PR",
        url: "https://github.com/acme/app/pull/1",
        headRefName: "feature-1",
        number: 1,
      },
    ]);
  });
});

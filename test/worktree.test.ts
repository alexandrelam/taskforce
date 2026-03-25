import { beforeEach, describe, expect, it, vi } from "vitest";

type LoadWorktreeOptions = {
  tmuxAvailable?: boolean;
  execSyncImpl?: (command: string, options?: unknown) => unknown;
  execFileSyncImpl?: (file: string, args: string[], options?: unknown) => unknown;
  existsSyncImpl?: (path: string) => boolean;
  readFileSyncImpl?: (path: string, encoding: string) => string;
};

async function loadWorktree(options: LoadWorktreeOptions = {}) {
  const execSync = vi.fn(options.execSyncImpl ?? (() => ""));
  const execFileSync = vi.fn(options.execFileSyncImpl ?? (() => ""));
  const existsSync = vi.fn(options.existsSyncImpl ?? (() => false));
  const readFileSync = vi.fn(options.readFileSyncImpl ?? (() => ""));
  const unlinkSync = vi.fn();
  const sanitizeSessionId = vi.fn((value: string) => value.replace(/[.:]/g, "-"));

  vi.doMock("child_process", () => ({ execSync, execFileSync }));
  vi.doMock("fs", () => ({ existsSync, readFileSync, unlinkSync }));
  vi.doMock("os", () => ({ default: { tmpdir: () => "/tmp" }, tmpdir: () => "/tmp" }));
  vi.doMock("../src/pty.js", () => ({
    tmuxAvailable: options.tmuxAvailable ?? true,
    sanitizeSessionId,
  }));

  const mod = await import("../src/worktree.ts");
  return { mod, execSync, execFileSync, existsSync, readFileSync, unlinkSync, sanitizeSessionId };
}

describe("worktree helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("slugify normalizes and truncates titles", async () => {
    const { mod } = await loadWorktree();
    expect(mod.slugify(" Add User Authentication!!! ")).toBe("add-user-authentication");
    expect(mod.slugify("a".repeat(80))).toHaveLength(50);
  });

  it("createWorktree rejects non-git directories", async () => {
    const { mod } = await loadWorktree({
      execFileSyncImpl: (file, args) => {
        if (file === "git" && args[0] === "rev-parse" && args.includes("--git-dir")) {
          throw new Error("not a repo");
        }
        return "";
      },
    });

    expect(mod.createWorktree("/repo/app", "ticket-slug")).toEqual({
      worktreePath: null,
      error: "Project is not a git repository",
    });
  });

  it("createWorktree uses the provided base branch", async () => {
    const { mod, execFileSync } = await loadWorktree({
      execFileSyncImpl: (file, args) => {
        if (file === "git" && args.includes("--git-dir")) {
          return ".git";
        }
        return "";
      },
    });

    expect(mod.createWorktree("/repo/app", "ticket-slug", " main ")).toEqual({
      worktreePath: "/repo/app-ticket-slug",
      error: null,
    });
    expect(execFileSync).toHaveBeenCalledWith(
      "git",
      ["worktree", "add", "/repo/app-ticket-slug", "-b", "ticket-slug", "main"],
      expect.objectContaining({ cwd: "/repo/app" })
    );
  });

  it("createWorktree falls back to the current branch and errors when unavailable", async () => {
    const { mod } = await loadWorktree({
      execFileSyncImpl: (file, args) => {
        if (file === "git" && args.includes("--git-dir")) {
          return ".git";
        }
        if (file === "git" && args.includes("--abbrev-ref")) {
          throw new Error("no branch");
        }
        return "";
      },
    });

    expect(mod.createWorktree("/repo/app", "ticket-slug")).toEqual({
      worktreePath: null,
      error: "Could not determine base branch",
    });
  });

  it("createWorktreeFromBranch reports missing branches", async () => {
    const { mod } = await loadWorktree({
      execFileSyncImpl: (file, args) => {
        if (file === "git" && args.includes("--git-dir")) {
          return ".git";
        }
        if (file === "git" && args.includes("--verify") && args.includes("origin/feature-x")) {
          throw new Error("missing");
        }
        return "";
      },
    });

    expect(mod.createWorktreeFromBranch("/repo/app", "origin/feature-x")).toEqual({
      worktreePath: null,
      error: "Branch 'origin/feature-x' not found",
    });
  });

  it("runPostWorktreeCommand skips blank commands", async () => {
    const { mod, execSync } = await loadWorktree();

    expect(mod.runPostWorktreeCommand("/repo/app", "   ")).toEqual({ output: null, error: null });
    expect(execSync).not.toHaveBeenCalled();
  });

  it("spawnTmuxCommand returns an explicit error when tmux is unavailable", async () => {
    const { mod } = await loadWorktree({ tmuxAvailable: false });
    expect(mod.spawnTmuxCommand("ticket:1.setup", "/repo/app", "npm install")).toEqual({
      success: false,
      error: "tmux is not available",
    });
  });

  it("getTmuxSessionStatus returns running while the tmux session exists", async () => {
    const { mod } = await loadWorktree({
      execFileSyncImpl: (file, args) => {
        if (file === "tmux" && args.includes("has-session") && args.includes("ticket-1-setup")) {
          return "";
        }
        return "";
      },
    });

    expect(mod.getTmuxSessionStatus("ticket.1:setup")).toEqual({ running: true, exitCode: null });
  });

  it("getTmuxSessionStatus reads the exit code file once the session ends", async () => {
    const { mod } = await loadWorktree({
      execFileSyncImpl: (file, args) => {
        if (file === "tmux" && args.includes("has-session") && args.includes("ticket-1-setup")) {
          throw new Error("missing");
        }
        return "";
      },
      existsSyncImpl: (path) => path === "/tmp/tmux-exit-ticket-1-setup",
      readFileSyncImpl: () => "0\n",
    });

    expect(mod.getTmuxSessionStatus("ticket.1:setup")).toEqual({ running: false, exitCode: 0 });
  });
});

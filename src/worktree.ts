import { execSync } from "child_process";
import path from "path";
import { existsSync, unlinkSync, readFileSync } from "fs";
import os from "os";
import { tmuxAvailable, sanitizeSessionId } from "./pty.js";

/**
 * Convert a ticket title to a filesystem-safe slug
 * Example: "Add User Authentication!" -> "add-user-authentication"
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, "") // Trim leading/trailing dashes
    .slice(0, 50); // Limit length
}

/**
 * Get the current git branch for a directory
 */
export function getCurrentBranch(cwd: string): string | null {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return branch;
  } catch {
    return null;
  }
}

/**
 * Check if a directory is a git repository
 */
export function isGitRepo(cwd: string): boolean {
  try {
    execSync("git rev-parse --git-dir", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

interface WorktreeResult {
  worktreePath: string | null;
  error: string | null;
}

/**
 * Create a git worktree for a ticket
 * @param projectPath - The path to the project (main git repo)
 * @param ticketSlug - The slugified ticket title
 * @returns The worktree path or error
 */
export function createWorktree(projectPath: string, ticketSlug: string): WorktreeResult {
  // Check if it's a git repo
  if (!isGitRepo(projectPath)) {
    return { worktreePath: null, error: "Project is not a git repository" };
  }

  // Get project folder name and parent directory
  const projectName = path.basename(projectPath);
  const parentDir = path.dirname(projectPath);

  // Generate worktree path: <parent>/<project-name>-<ticket-slug>
  const worktreeName = `${projectName}-${ticketSlug}`;
  const worktreePath = path.join(parentDir, worktreeName);

  // Get current branch
  const branch = getCurrentBranch(projectPath);
  if (!branch) {
    return { worktreePath: null, error: "Could not determine current branch" };
  }

  try {
    // Create worktree from current branch
    execSync(`git worktree add "${worktreePath}" -b "${ticketSlug}" ${branch}`, {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { worktreePath, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { worktreePath: null, error: message };
  }
}

interface PostCommandResult {
  output: string | null;
  error: string | null;
}

/**
 * Run a command in a worktree directory after creation
 * @param cwd - The worktree directory to run the command in
 * @param command - The shell command to execute
 * @returns Output and error information
 */
export function runPostWorktreeCommand(cwd: string, command: string): PostCommandResult {
  if (!command.trim()) {
    return { output: null, error: null };
  }

  try {
    const output = execSync(command, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 300000, // 5 minute timeout for long commands like npm i
    });
    return { output: output.trim(), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { output: null, error: message };
  }
}

/**
 * Create a git worktree from an existing branch (local or remote)
 * @param projectPath - The path to the project (main git repo)
 * @param branchName - The name of the existing branch (e.g., "feature-x" or "origin/feature-x")
 * @returns The worktree path or error
 */
export function createWorktreeFromBranch(projectPath: string, branchName: string): WorktreeResult {
  if (!isGitRepo(projectPath)) {
    return { worktreePath: null, error: "Project is not a git repository" };
  }

  const projectName = path.basename(projectPath);
  const parentDir = path.dirname(projectPath);

  // Sanitize branch name for directory: remove "origin/" prefix and slugify
  const branchSlug = slugify(branchName.replace(/^origin\//, ""));
  const worktreeName = `${projectName}-${branchSlug}`;
  const worktreePath = path.join(parentDir, worktreeName);

  try {
    // Check if branch exists (local or remote)
    execSync(`git rev-parse --verify "${branchName}"`, {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return { worktreePath: null, error: `Branch '${branchName}' not found` };
  }

  try {
    // Create worktree from existing branch (no -b flag)
    execSync(`git worktree add "${worktreePath}" "${branchName}"`, {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { worktreePath, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { worktreePath: null, error: message };
  }
}

/**
 * Remove a git worktree
 * @param projectPath - The path to the main project (git repo)
 * @param worktreePath - The path to the worktree to remove
 */
export function removeWorktree(
  projectPath: string,
  worktreePath: string
): { success: boolean; error: string | null } {
  try {
    execSync(`git worktree remove "${worktreePath}" --force`, {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

// --- Tmux Setup Session Functions ---

/**
 * Get the path to the exit code file for a tmux session
 */
function getExitCodePath(sessionName: string): string {
  return path.join(os.tmpdir(), `tmux-exit-${sessionName}`);
}

/**
 * Check if tmux is available
 */
export function isTmuxAvailable(): boolean {
  return tmuxAvailable;
}

interface SpawnResult {
  success: boolean;
  error: string | null;
}

/**
 * Spawn a tmux session to run a command in the background
 * @param sessionName - Unique session name (e.g., "{ticketId}-setup")
 * @param cwd - Working directory for the command
 * @param command - Shell command to execute
 * @returns Success status and any immediate errors
 */
export function spawnTmuxCommand(sessionName: string, cwd: string, command: string): SpawnResult {
  if (!tmuxAvailable) {
    return { success: false, error: "tmux is not available" };
  }

  const sanitizedName = sanitizeSessionId(sessionName);
  const exitCodePath = getExitCodePath(sanitizedName);

  // Clean up any existing exit code file
  if (existsSync(exitCodePath)) {
    try {
      unlinkSync(exitCodePath);
    } catch {
      // Ignore cleanup errors
    }
  }

  try {
    // Wrap the command to capture exit code
    // The command runs, then writes its exit code to a file
    const wrappedCommand = `${command}; echo $? > "${exitCodePath}"`;

    execSync(
      `tmux new-session -d -s "${sanitizedName}" -c "${cwd}" "${wrappedCommand.replace(/"/g, '\\"')}"`,
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

interface SessionStatus {
  running: boolean;
  exitCode: number | null;
}

/**
 * Check if a tmux session is still running
 * @param sessionName - The tmux session name to check
 * @returns Whether the session is running and its exit code if finished
 */
export function getTmuxSessionStatus(sessionName: string): SessionStatus {
  if (!tmuxAvailable) {
    return { running: false, exitCode: null };
  }

  const sanitizedName = sanitizeSessionId(sessionName);

  // Check if session exists
  try {
    execSync(`tmux has-session -t "${sanitizedName}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { running: true, exitCode: null };
  } catch {
    // Session doesn't exist - check for exit code file
    const exitCodePath = getExitCodePath(sanitizedName);
    if (existsSync(exitCodePath)) {
      try {
        const exitCodeStr = readFileSync(exitCodePath, "utf-8").trim();
        const exitCode = parseInt(exitCodeStr, 10);
        return { running: false, exitCode: isNaN(exitCode) ? 1 : exitCode };
      } catch {
        return { running: false, exitCode: 1 };
      }
    }
    return { running: false, exitCode: null };
  }
}

/**
 * Capture the output buffer from a tmux session
 * @param sessionName - The tmux session name
 * @returns The captured output text
 */
export function captureTmuxOutput(sessionName: string): string {
  if (!tmuxAvailable) {
    return "";
  }

  const sanitizedName = sanitizeSessionId(sessionName);

  try {
    // Capture the entire scrollback buffer
    const output = execSync(`tmux capture-pane -t "${sanitizedName}" -p -S -`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    return output;
  } catch {
    return "";
  }
}

/**
 * Kill a setup tmux session and clean up
 * @param sessionName - The tmux session name to kill
 */
export function killSetupTmuxSession(sessionName: string): void {
  if (!tmuxAvailable) return;

  const sanitizedName = sanitizeSessionId(sessionName);

  // Kill the session
  try {
    execSync(`tmux kill-session -t "${sanitizedName}"`, { stdio: "ignore" });
  } catch {
    // Session may already be dead
  }

  // Clean up exit code file
  const exitCodePath = getExitCodePath(sanitizedName);
  if (existsSync(exitCodePath)) {
    try {
      unlinkSync(exitCodePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

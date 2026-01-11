"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
exports.getCurrentBranch = getCurrentBranch;
exports.isGitRepo = isGitRepo;
exports.createWorktree = createWorktree;
exports.runPostWorktreeCommand = runPostWorktreeCommand;
exports.createWorktreeFromBranch = createWorktreeFromBranch;
exports.removeWorktree = removeWorktree;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
/**
 * Convert a ticket title to a filesystem-safe slug
 * Example: "Add User Authentication!" -> "add-user-authentication"
 */
function slugify(title) {
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
function getCurrentBranch(cwd) {
    try {
        const branch = (0, child_process_1.execSync)("git rev-parse --abbrev-ref HEAD", {
            cwd,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        return branch;
    }
    catch {
        return null;
    }
}
/**
 * Check if a directory is a git repository
 */
function isGitRepo(cwd) {
    try {
        (0, child_process_1.execSync)("git rev-parse --git-dir", {
            cwd,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Create a git worktree for a ticket
 * @param projectPath - The path to the project (main git repo)
 * @param ticketSlug - The slugified ticket title
 * @returns The worktree path or error
 */
function createWorktree(projectPath, ticketSlug) {
    // Check if it's a git repo
    if (!isGitRepo(projectPath)) {
        return { worktreePath: null, error: "Project is not a git repository" };
    }
    // Get project folder name and parent directory
    const projectName = path_1.default.basename(projectPath);
    const parentDir = path_1.default.dirname(projectPath);
    // Generate worktree path: <parent>/<project-name>-<ticket-slug>
    const worktreeName = `${projectName}-${ticketSlug}`;
    const worktreePath = path_1.default.join(parentDir, worktreeName);
    // Get current branch
    const branch = getCurrentBranch(projectPath);
    if (!branch) {
        return { worktreePath: null, error: "Could not determine current branch" };
    }
    try {
        // Create worktree from current branch
        (0, child_process_1.execSync)(`git worktree add "${worktreePath}" -b "${worktreeName}" ${branch}`, {
            cwd: projectPath,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        return { worktreePath, error: null };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { worktreePath: null, error: message };
    }
}
/**
 * Run a command in a worktree directory after creation
 * @param cwd - The worktree directory to run the command in
 * @param command - The shell command to execute
 * @returns Output and error information
 */
function runPostWorktreeCommand(cwd, command) {
    if (!command.trim()) {
        return { output: null, error: null };
    }
    try {
        const output = (0, child_process_1.execSync)(command, {
            cwd,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 300000, // 5 minute timeout for long commands like npm i
        });
        return { output: output.trim(), error: null };
    }
    catch (err) {
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
function createWorktreeFromBranch(projectPath, branchName) {
    if (!isGitRepo(projectPath)) {
        return { worktreePath: null, error: "Project is not a git repository" };
    }
    const projectName = path_1.default.basename(projectPath);
    const parentDir = path_1.default.dirname(projectPath);
    // Sanitize branch name for directory: remove "origin/" prefix and slugify
    const branchSlug = slugify(branchName.replace(/^origin\//, ""));
    const worktreeName = `${projectName}-${branchSlug}`;
    const worktreePath = path_1.default.join(parentDir, worktreeName);
    try {
        // Check if branch exists (local or remote)
        (0, child_process_1.execSync)(`git rev-parse --verify "${branchName}"`, {
            cwd: projectPath,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
    }
    catch {
        return { worktreePath: null, error: `Branch '${branchName}' not found` };
    }
    try {
        // Create worktree from existing branch (no -b flag)
        (0, child_process_1.execSync)(`git worktree add "${worktreePath}" "${branchName}"`, {
            cwd: projectPath,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        return { worktreePath, error: null };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { worktreePath: null, error: message };
    }
}
/**
 * Remove a git worktree
 * @param projectPath - The path to the main project (git repo)
 * @param worktreePath - The path to the worktree to remove
 */
function removeWorktree(projectPath, worktreePath) {
    try {
        (0, child_process_1.execSync)(`git worktree remove "${worktreePath}" --force`, {
            cwd: projectPath,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        return { success: true, error: null };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
    }
}
//# sourceMappingURL=worktree.js.map
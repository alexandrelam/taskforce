/**
 * Convert a ticket title to a filesystem-safe slug
 * Example: "Add User Authentication!" -> "add-user-authentication"
 */
export declare function slugify(title: string): string;
/**
 * Get the current git branch for a directory
 */
export declare function getCurrentBranch(cwd: string): string | null;
/**
 * Check if a directory is a git repository
 */
export declare function isGitRepo(cwd: string): boolean;
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
export declare function createWorktree(projectPath: string, ticketSlug: string): WorktreeResult;
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
export declare function runPostWorktreeCommand(cwd: string, command: string): PostCommandResult;
/**
 * Create a git worktree from an existing branch (local or remote)
 * @param projectPath - The path to the project (main git repo)
 * @param branchName - The name of the existing branch (e.g., "feature-x" or "origin/feature-x")
 * @returns The worktree path or error
 */
export declare function createWorktreeFromBranch(projectPath: string, branchName: string): WorktreeResult;
/**
 * Remove a git worktree
 * @param projectPath - The path to the main project (git repo)
 * @param worktreePath - The path to the worktree to remove
 */
export declare function removeWorktree(projectPath: string, worktreePath: string): {
    success: boolean;
    error: string | null;
};
/**
 * Check if tmux is available
 */
export declare function isTmuxAvailable(): boolean;
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
export declare function spawnTmuxCommand(sessionName: string, cwd: string, command: string): SpawnResult;
interface SessionStatus {
    running: boolean;
    exitCode: number | null;
}
/**
 * Check if a tmux session is still running
 * @param sessionName - The tmux session name to check
 * @returns Whether the session is running and its exit code if finished
 */
export declare function getTmuxSessionStatus(sessionName: string): SessionStatus;
/**
 * Capture the output buffer from a tmux session
 * @param sessionName - The tmux session name
 * @returns The captured output text
 */
export declare function captureTmuxOutput(sessionName: string): string;
/**
 * Kill a setup tmux session and clean up
 * @param sessionName - The tmux session name to kill
 */
export declare function killSetupTmuxSession(sessionName: string): void;
export {};
//# sourceMappingURL=worktree.d.ts.map
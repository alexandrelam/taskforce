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
export {};
//# sourceMappingURL=worktree.d.ts.map
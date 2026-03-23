export type WorktreeCreator = () => {
    worktreePath: string | null;
    error: string | null;
};
interface SetupPlan {
    create: WorktreeCreator;
}
export declare function createTicketWorktree(projectPath: string, title: string, baseBranch?: string): SetupPlan;
export declare function createBranchWorktree(projectPath: string, branchName: string): SetupPlan;
export declare function runTicketSetup(ticketId: string, createWorktreeFn: WorktreeCreator, postWorktreeCommand: string | null): Promise<void>;
export {};
//# sourceMappingURL=ticket-setup-service.d.ts.map
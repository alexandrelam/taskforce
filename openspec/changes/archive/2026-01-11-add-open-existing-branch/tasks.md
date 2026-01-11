## 1. Backend Implementation

- [x] 1.1 Add `createWorktreeFromBranch` function in `src/worktree.ts` that creates worktree from existing branch without creating a new branch
- [x] 1.2 Add `POST /api/tickets/from-branch` endpoint in `src/index.ts`
- [x] 1.3 Create async setup function `runBranchTicketSetup` that uses `createWorktreeFromBranch` and runs post-worktree command

## 2. Frontend Implementation

- [x] 2.1 Add "Open Branch" button next to "Add Ticket" button in `TaskBoard.tsx`
- [x] 2.2 Add dialog with branch name text input and optional description field
- [x] 2.3 Add `handleOpenBranch` function to call new API endpoint
- [x] 2.4 Reuse existing ticket card display and setup status indicators

## 3. Validation

- [x] 3.1 Test opening a local branch
- [x] 3.2 Test opening a remote branch (e.g., `origin/feature-x`)
- [x] 3.3 Test opening non-existent branch shows failed status
- [x] 3.4 Test post-worktree command runs after worktree creation

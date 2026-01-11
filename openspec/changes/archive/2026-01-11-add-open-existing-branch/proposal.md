# Change: Add ability to open existing branch as ticket

## Why

Currently, users can only create tickets with new branches (worktrees created from scratch). Users need the ability to import existing local or remote branches into the app as tickets, so they can continue work on branches created outside the app or collaborate on existing branches.

## What Changes

- Add an "Open Existing Branch" dialog alongside the existing "Add Ticket" button
- Backend API to list available branches (local + remote)
- Backend API to create ticket from existing branch (creates worktree from branch)
- Reuse existing async setup flow (worktree creation + post-command)
- Text input field for branch name (user types branch name)

## Impact

- Affected specs: kanban-board
- Affected code:
  - `src/index.ts` - new API endpoints
  - `src/worktree.ts` - new function to create worktree from existing branch
  - `web/src/components/TaskBoard.tsx` - new dialog and button

# Change: Add Git Worktree Creation on Ticket Create

## Why

Users want each ticket to work in an isolated git worktree, allowing parallel development on multiple tickets without branch switching conflicts. When a ticket is created, a new worktree should be automatically created at `../<project-name>-<ticket-title-slug>` so developers can work on multiple features simultaneously.

## What Changes

- Backend: When creating a ticket, run `git worktree add` to create a new worktree at `../<project-name>-<ticket-title>` based on the current branch
- Database: Add `worktreePath` column to tickets table to store the worktree location
- Backend: Return error information if worktree creation fails (but still create the ticket)
- Frontend: Display error notification if worktree creation fails
- Terminal: Open in the worktree path instead of the project path when a worktree exists

## Impact

- Affected specs: `kanban-board`
- Affected code:
  - `src/index.ts` - POST /api/tickets endpoint
  - `src/db/schema.ts` - tickets table schema
  - `web/src/components/TaskBoard.tsx` - ticket creation and terminal cwd

# Change: Add asynchronous ticket creation with progress observability

## Why

Ticket creation is currently blocking for up to 5 minutes when the post-worktree command (e.g., `npm install`) runs. Users are stuck waiting in the UI with no visibility into what's happening. For large projects with many dependencies, this creates a poor user experience.

## What Changes

- **NEW**: Ticket creation becomes asynchronous - API returns immediately with a "pending" status
- **NEW**: Tickets have a `setupStatus` field to track creation progress (`pending`, `creating_worktree`, `running_post_command`, `ready`, `failed`)
- **NEW**: Tickets have a `setupError` field to store error details on failure
- **NEW**: Tickets have a `setupLogs` field to store output from commands
- **NEW**: Kanban board shows visual status indicator for tickets being set up
- **NEW**: Clicking on a "pending" ticket shows setup progress/logs instead of terminal
- **MODIFIED**: `POST /api/tickets` returns immediately with `setupStatus: "pending"` instead of waiting for worktree/command completion

## Impact

- Affected specs: `kanban-board`, `database`
- Affected code:
  - `src/index.ts` (API endpoint changes to async)
  - `src/worktree.ts` (async versions of worktree functions)
  - `src/db/schema.ts` (new columns for status tracking)
  - `web/src/components/TaskBoard.tsx` (status indicators, progress view)

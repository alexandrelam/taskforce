# Change: Add Manual Status Override

## Why

When users manually move tickets between columns on the Kanban board, the automatic status tracking API (triggered by Claude Code hooks based on `cwd`) can override their manual changes. Users need the ability to manually control ticket status and have that decision persist until they choose otherwise.

## What Changes

- Add `statusOverride` column to tickets table to track manual status control
- When a user manually drags a ticket to a different column, set `statusOverride: true`
- Automatic tracking API (`/api/tickets/track/start` and `/api/tickets/track/stop`) will skip tickets with `statusOverride: true`
- Add UI indicator showing when a ticket has manual override enabled
- Add ability to clear the override (allow automatic tracking again)

## Impact

- Affected specs: `kanban-board`
- Affected code:
  - `src/db/schema.ts` - Add `statusOverride` column
  - `src/index.ts` - Update PATCH endpoint to set override, modify track/start and track/stop to respect override
  - `web/src/components/TaskBoard.tsx` - Add override indicator and clear button

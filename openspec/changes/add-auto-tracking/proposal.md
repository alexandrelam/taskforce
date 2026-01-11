# Change: Add Automatic Ticket Status Tracking via Claude Code Hooks

## Why

When working on tickets using Claude Code, there's no visibility into which tickets are actively being worked on. Users must manually drag tickets between columns, which can be forgotten or inconsistent. Automatic status tracking via Claude Code hooks will provide real-time visibility into ticket progress.

## What Changes

- Add `lastActivityAt` column to tickets table for tracking Claude activity timestamps
- Add new API endpoints for Claude hooks to report session start/stop events
- Add `POST /api/tickets/track/start` - moves ticket to "In Progress" based on worktree path
- Add `POST /api/tickets/track/stop` - moves ticket back to "To Do" for user review
- Create user documentation for configuring Claude Code hooks

## Impact

- Affected specs: `database`, `kanban-board`
- Affected code: `src/db/schema.ts`, `src/index.ts`
- New file: `HOOKS.md` (user-facing hook configuration instructions)

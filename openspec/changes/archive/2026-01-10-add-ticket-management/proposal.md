# Change: Add Ticket Management (Create/Delete)

## Why

Currently, the Kanban board displays hardcoded default tickets. Users need the ability to create their own tickets and delete existing ones, with ticket data persisted in SQLite.

## What Changes

- **BREAKING**: Remove hardcoded default tickets from `initialColumns`
- Add a `tickets` table to SQLite schema for persisting ticket data
- Add REST API endpoints for CRUD operations on tickets
- Add UI buttons to create and delete tickets
- When creating a ticket, automatically `cd` to the configured project path in the terminal (if set)

## Impact

- Affected specs: `kanban-board`, `database`
- Affected code:
  - `src/db/schema.ts` - Add tickets table
  - `src/index.ts` - Add ticket API endpoints
  - `web/src/components/TaskBoard.tsx` - Add create/delete UI, fetch tickets from API

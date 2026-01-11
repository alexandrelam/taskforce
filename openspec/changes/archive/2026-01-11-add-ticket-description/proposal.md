# Change: Add Optional Ticket Description

## Why

Users want to add context to tickets to remember what they're working on. Currently tickets only have a title, which doesn't provide enough space for detailed task context or notes.

## What Changes

- Add optional `description` field to tickets database schema
- Update ticket creation dialog to include description textarea
- Display description below ticket title on kanban cards
- Update API endpoints to handle description field

## Impact

- Affected specs: kanban-board
- Affected code:
  - `src/db/schema.ts` - Add description column
  - `src/index.ts` - Update ticket API endpoints
  - `web/src/components/TaskBoard.tsx` - Update UI components

# Change: Add Ticket Column Timer

## Why

Users need visibility into how long tickets have been in their current column to track progress and identify bottlenecks. A simple timer on each ticket card helps surface stale items and provides at-a-glance time tracking without requiring manual logging.

## What Changes

- Display elapsed time on each ticket card showing how long it has been in the current column
- Timer resets to zero when a ticket is moved to a different column
- Timer persists across page refreshes by storing `columnEnteredAt` timestamp
- Frontend-only visual component with no backend API changes (timestamp stored in existing ticket state)

## Impact

- Affected specs: `kanban-board`
- Affected code: `web/src/components/TaskBoard.tsx`

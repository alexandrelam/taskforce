# Change: Add Terminal Session Persistence

## Why

Currently, when switching between Kanban cards, the terminal session is destroyed and recreated from scratch. Users lose their shell history, running processes, and working context. This forces users to re-establish their terminal state every time they switch tasks.

## What Changes

- Terminal sessions persist per-card and are hidden (not destroyed) when switching cards
- Backend PTY sessions remain alive until explicitly closed
- Each card maintains its own independent terminal session
- Sessions are cleaned up when the terminal panel is closed (X button) or when the page is unloaded

## Impact

- Affected specs: kanban-board
- Affected code:
  - `web/src/components/Terminal.tsx` - Add session management props
  - `web/src/components/TaskBoard.tsx` - Manage multiple terminal instances

# Change: Add Project Settings with Terminal Directory

## Why

Users need a way to configure a default project path so that when opening a terminal, it automatically navigates to the correct folder instead of defaulting to the home directory. This improves workflow efficiency when working on specific projects.

## What Changes

- Add a `settings` table to SQLite schema storing key-value pairs (starting with `project_path`)
- Create a Settings dialog component (shadcn-style with sidebar navigation)
- Add REST API endpoints to read/write settings
- Modify PTY backend to accept optional `cwd` parameter and use configured project path
- Update frontend Terminal component to fetch project path and pass it when connecting

## Impact

- Affected specs: `settings` (new capability), `database` (modified), `kanban-board` (modified)
- Affected code:
  - `src/db/schema.ts` - add settings table
  - `src/index.ts` - add settings API endpoints
  - `src/pty.ts` - accept cwd from WebSocket connection
  - `web/src/components/SettingsDialog.tsx` - new component
  - `web/src/components/Terminal.tsx` - fetch and pass project path
  - `web/src/components/TaskBoard.tsx` - add settings button

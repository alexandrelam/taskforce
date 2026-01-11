# Change: Add Configurable Project Panes

## Why

Users need to run multiple terminal sessions per ticket for different purposes (e.g., frontend dev server, backend server, logs). Currently, each ticket only has a single "claude" terminal. Adding configurable panes per project allows users to define reusable terminal configurations like "frontend", "backend", "logs" that spawn alongside the default "claude" pane.

## What Changes

- Add a `panes` JSON field to the `projects` table to store pane configurations
- Add UI in the Settings > Projects section to add/remove custom panes per project
- Modify the terminal panel to show tabs for each configured pane
- Each pane gets its own tmux session (using pattern `{ticketId}-{paneName}`)
- The "claude" pane is always present and cannot be removed
- Panes are created lazily when the user switches to them (not all at once on ticket click)

## Impact

- Affected specs: `projects`, `settings`, `terminal-persistence`
- Affected code:
  - `src/db/schema.ts` - Add panes field to projects
  - `src/index.ts` - Update projects API
  - `src/pty.ts` - Handle multiple session names per ticket
  - `web/src/components/SettingsDialog.tsx` - Pane configuration UI
  - `web/src/components/TerminalManager.tsx` - Multi-pane support
  - `web/src/components/TaskBoard.tsx` - Tab UI for panes

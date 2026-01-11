# Change: Add "Open in Editor" button for tickets

## Why

Users need to quickly open ticket worktrees in their preferred code editor. Currently, there's no way to launch an editor directly from the UI, requiring users to manually navigate to the worktree directory and open it in their editor.

## What Changes

- Add a project-level setting to configure the preferred text editor (neovim, cursor, vscode, intellij)
- Add an "Open in Editor" button to each ticket card on the kanban board
- The button launches the configured editor in the ticket's worktree directory (or project root for main tickets)

## Impact

- Affected specs: `settings`, `kanban-board`
- Affected code:
  - `src/db/schema.ts` - Add `editor` column to projects table
  - `src/index.ts` - Update project API to handle editor field
  - `web/src/components/SettingsDialog.tsx` - Add editor selector per project
  - `web/src/components/TaskBoard.tsx` - Add open in editor button to ticket cards
  - New backend endpoint to execute editor command

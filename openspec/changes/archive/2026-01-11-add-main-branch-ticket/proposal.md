# Change: Add Main Branch Ticket

## Why

Users need quick terminal access to the main branch of their project without creating a worktree. Currently, all tickets create worktrees, but there's no easy way to work directly on the main branch. A permanent "main" ticket per project provides this access and helps users differentiate between main branch work and feature branch work.

## What Changes

- Auto-create a special "main" ticket when a new project is created
- Main ticket uses the project's root path (no worktree) for terminal access
- Main ticket is visually differentiated with a "main" badge/icon
- Main ticket is draggable between columns like regular tickets
- Main ticket cannot be deleted (permanent per project)

## Impact

- Affected specs: `kanban-board`
- Affected code:
  - `src/db/schema.ts` - add `isMain` boolean field to tickets table
  - `src/index.ts` - auto-create main ticket on project creation, prevent deletion of main tickets
  - `web/src/components/TaskBoard.tsx` - render main badge, conditionally hide delete button

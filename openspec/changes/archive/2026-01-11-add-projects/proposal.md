# Change: Add Projects Feature

## Why

Users want to organize tickets by project, where each project has a dedicated directory path. This enables working on multiple codebases while keeping tickets scoped to the appropriate project context. Currently, there's a single global "project path" setting, but users need per-project paths with ticket isolation.

## What Changes

- Add a new `projects` table to store project name and path
- Link tickets to projects via a `projectId` foreign key
- Add a project selector in the settings dialog to create/delete projects
- Add a project switcher in the main UI to filter the kanban board by project
- **BREAKING**: Remove global `project_path` setting (replaced by per-project paths)
- Selected project persists in SQLite (stored as a setting)
- Deleting a project cascade-deletes all its tickets

## Impact

- Affected specs: `database`, `settings`, `kanban-board`, new `projects` spec
- Affected code:
  - `src/db/schema.ts` - new projects table, updated tickets table
  - `src/index.ts` - new projects API endpoints, updated tickets endpoints
  - `web/src/components/SettingsDialog.tsx` - projects management section
  - `web/src/components/TaskBoard.tsx` - project selector and filtering

# Change: Move post-worktree command to per-project setting

## Why

The post-worktree command (e.g., `npm i`, `bundle install`) varies between projects since different projects use different package managers and setup procedures. Currently it's a global setting, which doesn't work well when managing multiple projects with different tech stacks.

## What Changes

- Add a `postWorktreeCommand` column to the `projects` table
- Move the post-worktree command input from General settings to each project's configuration
- Update the backend to read the command from the project instead of global settings
- Remove the global `worktree_post_command` setting from the General section

## Impact

- Affected specs: `projects`, `settings`
- Affected code:
  - `src/db/schema.ts` - Add column to projects table
  - `src/index.ts` - Read command from project instead of settings
  - `web/src/components/SettingsDialog.tsx` - Move command input to project section

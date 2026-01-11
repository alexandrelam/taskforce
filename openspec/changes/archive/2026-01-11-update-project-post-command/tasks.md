## 1. Database Schema

- [x] 1.1 Add `postWorktreeCommand` column to projects table in schema.ts
- [x] 1.2 Run `npm run db:push` to sync schema

## 2. Backend API

- [x] 2.1 Update POST /api/projects to accept `postWorktreeCommand` field
- [x] 2.2 Update ticket creation (POST /api/tickets) to read command from project instead of global settings
- [x] 2.3 Add PATCH /api/projects/:id endpoint to update project settings

## 3. Frontend UI

- [x] 3.1 Remove post-worktree command input from General settings section
- [x] 3.2 Add post-worktree command input to project creation form
- [x] 3.3 Add post-worktree command display/edit in existing project list items
- [x] 3.4 Update Project type interface to include postWorktreeCommand field

## 4. Cleanup

- [x] 4.1 Remove migration of existing global setting (optional, can leave orphaned data)

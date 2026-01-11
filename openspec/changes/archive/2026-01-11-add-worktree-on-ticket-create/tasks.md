## 1. Database Schema

- [x] 1.1 Add `worktreePath` column to tickets table in `src/db/schema.ts`
- [x] 1.2 Run `npm run db:push` to sync schema changes

## 2. Backend Implementation

- [x] 2.1 Create utility function to slugify ticket title (lowercase, replace spaces with dashes, remove special chars)
- [x] 2.2 Create utility function to get current git branch from a directory
- [x] 2.3 Create utility function to execute `git worktree add` command
- [x] 2.4 Update POST /api/tickets to:
  - Get project path from project ID
  - Generate worktree name: `<project-folder-name>-<ticket-title-slug>`
  - Generate worktree path: `<project-parent-dir>/<worktree-name>`
  - Execute git worktree add from project directory
  - Store worktree path in ticket record
  - Return worktree error info in response (if any)

## 3. API Response Updates

- [x] 3.1 Update ticket creation response to include `worktreePath` and `worktreeError` fields
- [x] 3.2 Update GET /api/tickets to return `worktreePath` field

## 4. Frontend Updates

- [x] 4.1 Update Task interface to include `worktreePath` field
- [x] 4.2 Show toast/notification if worktree creation failed
- [x] 4.3 Pass ticket's `worktreePath` (if set) to TerminalManager instead of project path

## 5. Cleanup

- [x] 5.1 Update ticket deletion to also remove the git worktree (`git worktree remove`)

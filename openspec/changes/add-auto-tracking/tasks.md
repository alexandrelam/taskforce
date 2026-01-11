## 1. Database Schema Update

- [x] 1.1 Add `lastActivityAt` column to tickets table in `src/db/schema.ts`
- [x] 1.2 Run `npm run db:push` to sync schema

## 2. API Implementation

- [x] 2.1 Add `POST /api/tickets/track/start` endpoint in `src/index.ts`
  - Query tickets by worktreePath matching cwd
  - Update column to "In Progress" and lastActivityAt
- [x] 2.2 Add `POST /api/tickets/track/stop` endpoint in `src/index.ts`
  - Query tickets by worktreePath matching cwd
  - Update column to "To Do" and lastActivityAt
- [x] 2.3 Test endpoints manually with curl

## 3. Documentation

- [x] 3.1 Create `HOOKS.md` with:
  - Overview of automatic tracking feature
  - SessionStart hook configuration (JSON)
  - Stop hook configuration (JSON)
  - Installation instructions for user and project settings
  - Example curl commands for testing

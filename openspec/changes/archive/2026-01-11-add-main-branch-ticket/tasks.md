## 1. Database Schema

- [x] 1.1 Add `isMain` boolean column to tickets table in `src/db/schema.ts`
- [x] 1.2 Run `npm run db:push` to sync schema

## 2. Backend API

- [x] 2.1 Modify POST `/api/projects` to auto-create a "main" ticket with `isMain: true` and `worktreePath: null`
- [x] 2.2 Modify DELETE `/api/tickets/:id` to reject deletion of main tickets (return 403)
- [x] 2.3 Include `isMain` field in ticket API responses

## 3. Frontend UI

- [x] 3.1 Update `Task` interface to include `isMain` field
- [x] 3.2 Render a "main" badge (branch icon or label) on main tickets in `TaskBoard.tsx`
- [x] 3.3 Hide delete button for main tickets
- [x] 3.4 When main ticket terminal opens, use project path instead of worktree path

## 4. Validation

- [x] 4.1 Verify main ticket is auto-created when creating a new project
- [x] 4.2 Verify main ticket cannot be deleted
- [x] 4.3 Verify main ticket terminal opens in project root directory
- [x] 4.4 Verify main ticket displays distinct visual badge

## 1. Database Schema

- [x] 1.1 Add `description` column (nullable text) to tickets table in `src/db/schema.ts`
- [x] 1.2 Run `npm run db:push` to sync schema

## 2. Backend API

- [x] 2.1 Update POST `/api/tickets` to accept optional `description` field
- [x] 2.2 Update GET `/api/tickets` to return `description` field
- [x] 2.3 Update PATCH `/api/tickets/:id` to allow updating `description` field

## 3. Frontend - Create Dialog

- [x] 3.1 Add description textarea to ticket creation dialog
- [x] 3.2 Update form state and submit handler to include description
- [x] 3.3 Style textarea to match existing UI

## 4. Frontend - Ticket Display

- [x] 4.1 Update Task interface to include optional `description` field
- [x] 4.2 Display description below ticket title on kanban cards (truncated if long)
- [x] 4.3 Ensure description doesn't break card layout

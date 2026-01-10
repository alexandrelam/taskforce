## 1. Database Schema

- [x] 1.1 Add `tickets` table to `src/db/schema.ts` with id, title, column, createdAt fields
- [x] 1.2 Run `npm run db:push` to sync schema

## 2. Backend API

- [x] 2.1 Add `GET /api/tickets` endpoint to list all tickets
- [x] 2.2 Add `POST /api/tickets` endpoint to create a ticket
- [x] 2.3 Add `DELETE /api/tickets/:id` endpoint to delete a ticket
- [x] 2.4 Add `PATCH /api/tickets/:id` endpoint to update ticket column (for drag-drop)

## 3. Frontend Changes

- [x] 3.1 Remove hardcoded `initialColumns` default tickets
- [x] 3.2 Fetch tickets from API on mount and populate columns
- [x] 3.3 Add "Create Ticket" button to UI (opens dialog/form)
- [x] 3.4 Add delete button to each ticket card
- [x] 3.5 Persist column changes (drag-drop) to backend
- [x] 3.6 When opening terminal for newly created ticket, send `cd <project_path>` command if configured

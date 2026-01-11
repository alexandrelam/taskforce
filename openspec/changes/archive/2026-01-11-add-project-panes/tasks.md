## 1. Database Schema

- [x] 1.1 Add `panes` column (text, nullable) to `projects` table in `src/db/schema.ts`
- [x] 1.2 Run `npm run db:push` to sync schema

## 2. Backend API

- [x] 2.1 Update `POST /api/projects` to accept optional `panes` array
- [x] 2.2 Update `PATCH /api/projects/:id` to accept `panes` array updates
- [x] 2.3 Ensure `GET /api/projects` returns `panes` field (parsed as JSON array)
- [x] 2.4 Update `DELETE /api/tickets/:id` to kill all pane sessions (pattern `{ticketId}-*`)

## 3. Frontend Settings UI

- [x] 3.1 Add pane configuration section in `SettingsDialog.tsx` under each project
- [x] 3.2 Create inline pane list with name display and delete button
- [x] 3.3 Add input field and "Add Pane" button for creating new panes
- [x] 3.4 Prevent duplicate pane names and empty names

## 4. Terminal Panel Tabs

- [x] 4.1 Create `TerminalTabs.tsx` component for horizontal tab navigation
- [x] 4.2 Update `TerminalManager.tsx` to manage multiple sessions per ticket
- [x] 4.3 Modify session ID generation to use `{ticketId}-{paneName}` format
- [x] 4.4 Integrate tabs into `TaskBoard.tsx` terminal panel

## 5. Session Management

- [x] 5.1 Update `killTmuxSession` in `pty.ts` to support killing multiple sessions by pattern
- [x] 5.2 Ensure "claude" pane is always present in tab list
- [x] 5.3 Implement lazy session creation (create on tab click, not on ticket open)

## 6. Testing

- [x] 6.1 Test creating project with custom panes
- [x] 6.2 Test adding/removing panes from existing project
- [x] 6.3 Test terminal tab switching between panes
- [x] 6.4 Test session persistence across reconnection for each pane
- [x] 6.5 Test ticket deletion cleans up all pane sessions

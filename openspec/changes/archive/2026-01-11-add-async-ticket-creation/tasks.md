## 1. Database Schema Changes

- [x] 1.1 Add `setupStatus` column to tickets table (text, default "ready")
- [x] 1.2 Add `setupError` column to tickets table (text, nullable)
- [x] 1.3 Add `setupLogs` column to tickets table (text, nullable)
- [x] 1.4 Run `npm run db:push` to apply schema changes

## 2. Backend API Changes

- [x] 2.1 Update `POST /api/tickets` to return immediately with `setupStatus: "pending"`
- [x] 2.2 Create async `runTicketSetup()` function that handles worktree creation and post-command
- [x] 2.3 Update ticket status to "creating_worktree" when starting worktree creation
- [x] 2.4 Update ticket status to "running_post_command" when running post-command
- [x] 2.5 Update ticket status to "ready" on success or "failed" on error
- [x] 2.6 Store command output in `setupLogs` field
- [x] 2.7 Store error message in `setupError` field on failure

## 3. Frontend Task Component Changes

- [x] 3.1 Add Task interface fields: `setupStatus`, `setupError`, `setupLogs`
- [x] 3.2 Update ticket card to show spinner for pending/in-progress status
- [x] 3.3 Update ticket card to show error indicator for failed status
- [x] 3.4 Show current step text ("Creating worktree...", "Installing dependencies...")

## 4. Frontend Setup Progress Panel

- [x] 4.1 Create SetupProgressPanel component to show logs and errors
- [x] 4.2 Modify card click handler to show progress panel instead of terminal when not ready
- [x] 4.3 Display setupLogs in scrollable pre-formatted area
- [x] 4.4 Display setupError prominently for failed tickets
- [x] 4.5 Allow opening terminal once status becomes "ready"

## 5. Testing

- [x] 5.1 Test ticket creation returns immediately
- [x] 5.2 Test status transitions (pending -> creating_worktree -> running_post_command -> ready)
- [x] 5.3 Test failed setup correctly stores error and shows indicator
- [x] 5.4 Test UI remains responsive during long-running post commands

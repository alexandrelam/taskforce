## ADDED Requirements

### Requirement: Manual Status Override

The system SHALL allow users to manually override automatic status tracking by dragging tickets between columns, preserving the manual status until explicitly cleared.

#### Scenario: Manual drag sets override

- **WHEN** a user drags a ticket from one column to another
- **THEN** the ticket's `statusOverride` is set to `true`
- **AND** the ticket's column is updated to the target column
- **AND** the change is persisted to the database

#### Scenario: Override blocks automatic tracking start

- **WHEN** a client sends `POST /api/tickets/track/start` with JSON body `{ cwd: string }`
- **AND** the matching ticket has `statusOverride: true`
- **THEN** the ticket's column is NOT updated
- **AND** the response contains `{ success: false, error: "Ticket has manual status override", ticketId: string }`
- **AND** HTTP status is 409 Conflict

#### Scenario: Override blocks automatic tracking stop

- **WHEN** a client sends `POST /api/tickets/track/stop` with JSON body `{ cwd: string }`
- **AND** the matching ticket has `statusOverride: true`
- **THEN** the ticket's column is NOT updated
- **AND** the response contains `{ success: false, error: "Ticket has manual status override", ticketId: string }`
- **AND** HTTP status is 409 Conflict

#### Scenario: Clear override via API

- **WHEN** a client sends `PATCH /api/tickets/:id/clear-override`
- **THEN** the ticket's `statusOverride` is set to `false`
- **AND** the response contains `{ success: true }`
- **AND** automatic tracking can now update the ticket

#### Scenario: Override indicator in UI

- **WHEN** a ticket has `statusOverride: true`
- **THEN** the ticket card displays a visual indicator (e.g., lock icon or badge)
- **AND** hovering shows tooltip explaining "Manual status - automatic tracking disabled"

#### Scenario: Clear override from UI

- **WHEN** a user clicks the override indicator on a ticket with `statusOverride: true`
- **THEN** a button or action appears to clear the override
- **AND** clicking it calls `PATCH /api/tickets/:id/clear-override`
- **AND** the visual indicator is removed after clearing

## MODIFIED Requirements

### Requirement: Automatic Status Tracking API

The system SHALL provide API endpoints for Claude Code hooks to report session activity, automatically updating ticket status based on worktree path, respecting manual overrides.

#### Scenario: Start tracking session

- **WHEN** a client sends `POST /api/tickets/track/start` with JSON body `{ cwd: string }`
- **AND** the `cwd` matches a ticket's `worktreePath`
- **AND** the ticket does NOT have `statusOverride: true`
- **THEN** the ticket's column is updated to "In Progress"
- **AND** the ticket's `lastActivityAt` is set to the current timestamp
- **AND** the response contains `{ success: true, ticketId: string, title: string }`

#### Scenario: Start tracking with no matching ticket

- **WHEN** a client sends `POST /api/tickets/track/start` with JSON body `{ cwd: string }`
- **AND** no ticket's `worktreePath` matches the `cwd`
- **THEN** the response contains `{ success: false, error: "No ticket found for this directory" }`
- **AND** HTTP status is 404

#### Scenario: Stop tracking session

- **WHEN** a client sends `POST /api/tickets/track/stop` with JSON body `{ cwd: string }`
- **AND** the `cwd` matches a ticket's `worktreePath`
- **AND** the ticket does NOT have `statusOverride: true`
- **THEN** the ticket's column is updated to "To Do"
- **AND** the ticket's `lastActivityAt` is set to the current timestamp
- **AND** the response contains `{ success: true, ticketId: string, title: string }`

#### Scenario: Stop tracking with no matching ticket

- **WHEN** a client sends `POST /api/tickets/track/stop` with JSON body `{ cwd: string }`
- **AND** no ticket's `worktreePath` matches the `cwd`
- **THEN** the response contains `{ success: false, error: "No ticket found for this directory" }`
- **AND** HTTP status is 404

## MODIFIED Requirements

### Requirement: Ticket Creation

The system SHALL allow users to create new tickets via the UI, associated with the current project, with non-blocking asynchronous setup.

#### Scenario: Create ticket button

- **WHEN** the user clicks the "Add Ticket" button
- **THEN** a dialog appears to enter the ticket title

#### Scenario: Submit new ticket

- **WHEN** the user enters a title and submits the form
- **AND** a project is selected
- **THEN** a new ticket is created in the "To Do" column linked to the current project
- **AND** the ticket is persisted to the database with `setupStatus: "pending"`
- **AND** the dialog closes immediately (does not wait for setup to complete)
- **AND** the board updates to show the new ticket with a setup indicator

#### Scenario: Terminal opens with project directory

- **WHEN** a ticket is created for a project
- **AND** the user opens the terminal for that ticket
- **AND** the ticket's `setupStatus` is "ready"
- **THEN** the terminal automatically runs `cd <project_path>` to navigate to the project's configured directory

### Requirement: Tickets API

The system SHALL provide REST API endpoints for ticket CRUD operations with project filtering, worktree management, and post-worktree command execution.

#### Scenario: Create ticket returns immediately

- **WHEN** a client sends `POST /api/tickets` with JSON body `{ title: string, projectId: string }`
- **THEN** the API responds immediately (within 100ms) with HTTP 201
- **AND** the response includes `setupStatus: "pending"`
- **AND** worktree creation and post-worktree command run asynchronously in the background

#### Scenario: Background setup updates status

- **WHEN** a ticket is created with `setupStatus: "pending"`
- **THEN** the system updates `setupStatus` to "creating_worktree" when starting worktree creation
- **AND** updates `setupStatus` to "running_post_command" when running the post-worktree command
- **AND** updates `setupStatus` to "ready" when all setup completes successfully
- **AND** updates `setupLogs` with command output as it becomes available

#### Scenario: Background setup failure

- **WHEN** worktree creation or post-worktree command fails during background setup
- **THEN** the system updates `setupStatus` to "failed"
- **AND** sets `setupError` with the error message
- **AND** the ticket remains in the database (not rolled back)

#### Scenario: Post-worktree command skipped when no command configured

- **WHEN** a ticket is created
- **AND** the project's `worktree_post_command` setting is empty or not set
- **THEN** the system transitions directly from "creating_worktree" to "ready"

## ADDED Requirements

### Requirement: Ticket Setup Status Display

The system SHALL display visual indicators for tickets that are being set up or have failed setup.

#### Scenario: Pending ticket indicator

- **WHEN** a ticket has `setupStatus` of "pending", "creating_worktree", or "running_post_command"
- **THEN** the ticket card displays a spinner or loading indicator
- **AND** shows the current setup step (e.g., "Creating worktree...", "Installing dependencies...")

#### Scenario: Failed ticket indicator

- **WHEN** a ticket has `setupStatus` of "failed"
- **THEN** the ticket card displays an error indicator (e.g., red badge or icon)
- **AND** hovering or clicking shows the error message

#### Scenario: Clicking pending ticket shows progress

- **WHEN** the user clicks on a ticket with `setupStatus` not "ready"
- **THEN** instead of opening the terminal, a panel shows setup progress
- **AND** displays the `setupLogs` content if available
- **AND** displays the `setupError` if status is "failed"

#### Scenario: Ready ticket opens terminal normally

- **WHEN** the user clicks on a ticket with `setupStatus: "ready"`
- **THEN** the terminal opens normally as before

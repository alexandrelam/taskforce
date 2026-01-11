## MODIFIED Requirements

### Requirement: Ticket Creation

The system SHALL allow users to create new tickets via the UI, associated with the current project, with non-blocking asynchronous setup and optional description.

#### Scenario: Create ticket button

- **WHEN** the user clicks the "Add Ticket" button
- **THEN** a dialog appears to enter the ticket title and optional description

#### Scenario: Submit new ticket

- **WHEN** the user enters a title and submits the form
- **AND** a project is selected
- **THEN** a new ticket is created in the "To Do" column linked to the current project
- **AND** the ticket is persisted to the database with `setupStatus: "pending"` and optional `description`
- **AND** the dialog closes immediately (does not wait for setup to complete)
- **AND** the board updates to show the new ticket with a setup indicator

#### Scenario: Submit ticket with description

- **WHEN** the user enters a title and description and submits the form
- **AND** a project is selected
- **THEN** a new ticket is created with the provided description
- **AND** the description is persisted to the database

#### Scenario: Terminal opens with project directory

- **WHEN** a ticket is created for a project
- **AND** the user opens the terminal for that ticket
- **AND** the ticket's `setupStatus` is "ready"
- **THEN** the terminal automatically runs `cd <project_path>` to navigate to the project's configured directory

### Requirement: Tickets API

The system SHALL provide REST API endpoints for ticket CRUD operations with project filtering, worktree management, post-worktree command execution, and optional description field.

#### Scenario: Create ticket returns immediately

- **WHEN** a client sends `POST /api/tickets` with JSON body `{ title: string, projectId: string, description?: string }`
- **THEN** the API responds immediately (within 100ms) with HTTP 201
- **AND** the response includes `setupStatus: "pending"` and `description` if provided
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

#### Scenario: Update ticket description

- **WHEN** a client sends `PATCH /api/tickets/:id` with JSON body `{ description: string }`
- **THEN** the ticket's description is updated
- **AND** the API responds with `{ success: true }`

## ADDED Requirements

### Requirement: Ticket Description Display

The system SHALL display ticket descriptions on kanban cards to provide context about the task.

#### Scenario: Description shown on card

- **WHEN** a ticket has a description
- **THEN** the description is displayed below the ticket title on the kanban card
- **AND** long descriptions are truncated to prevent card overflow

#### Scenario: No description on card

- **WHEN** a ticket has no description (null or empty)
- **THEN** only the ticket title is displayed on the kanban card
- **AND** no extra space is reserved for the missing description

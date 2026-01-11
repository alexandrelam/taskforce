## MODIFIED Requirements

### Requirement: Ticket Creation

The system SHALL allow users to create new tickets via the UI, associated with the current project, and automatically create a git worktree for the ticket.

#### Scenario: Create ticket button

- **WHEN** the user clicks the "Add Ticket" button
- **THEN** a dialog appears to enter the ticket title

#### Scenario: Submit new ticket

- **WHEN** the user enters a title and submits the form
- **AND** a project is selected
- **THEN** a new ticket is created in the "To Do" column linked to the current project
- **AND** the ticket is persisted to the database
- **AND** the board updates to show the new ticket

#### Scenario: Git worktree created on ticket creation

- **WHEN** a ticket is created for a project that is a git repository
- **THEN** the system creates a git worktree at `<project-parent-dir>/<project-folder-name>-<ticket-slug>`
- **AND** the worktree is based on the current branch of the project
- **AND** the worktree path is stored in the ticket record

#### Scenario: Worktree naming convention

- **WHEN** a ticket is created with title "Add User Authentication!"
- **AND** the project folder name is "myapp"
- **THEN** the worktree is created at `../myapp-add-user-authentication` relative to project path

#### Scenario: Worktree creation fails

- **WHEN** a ticket is created but git worktree creation fails (e.g., path exists, not a git repo)
- **THEN** the ticket is still created successfully
- **AND** an error notification is shown to the user
- **AND** the worktree path is not stored in the ticket record

#### Scenario: Terminal opens with worktree directory

- **WHEN** a ticket has a worktree path stored
- **AND** the user opens the terminal for that ticket
- **THEN** the terminal automatically opens in the worktree directory

#### Scenario: Terminal opens with project directory (no worktree)

- **WHEN** a ticket does not have a worktree path (worktree creation failed or legacy ticket)
- **AND** the user opens the terminal for that ticket
- **THEN** the terminal automatically opens in the project's configured directory

## MODIFIED Requirements

### Requirement: Ticket Deletion

The system SHALL allow users to delete tickets via the UI and clean up associated git worktrees.

#### Scenario: Delete ticket button

- **WHEN** the user hovers over or selects a ticket
- **THEN** a delete button is visible

#### Scenario: Confirm and delete ticket

- **WHEN** the user clicks the delete button
- **THEN** the ticket is removed from the board
- **AND** the ticket is deleted from the database

#### Scenario: Worktree removed on ticket deletion

- **WHEN** a ticket with a worktree path is deleted
- **THEN** the system runs `git worktree remove` to clean up the worktree
- **AND** the ticket is deleted even if worktree removal fails

## MODIFIED Requirements

### Requirement: Tickets API

The system SHALL provide REST API endpoints for ticket CRUD operations with project filtering and worktree management.

#### Scenario: List tickets

- **WHEN** a client sends `GET /api/tickets?projectId=<id>`
- **THEN** the response contains an array of tickets filtered by project
- **AND** each ticket includes `worktreePath` field (null if no worktree)

#### Scenario: Create ticket

- **WHEN** a client sends `POST /api/tickets` with JSON body `{ title: string, projectId: string }`
- **THEN** a new ticket is created with a generated UUID and default column "To Do"
- **AND** the ticket is linked to the specified project
- **AND** a git worktree is created at `<project-parent>/<project-name>-<ticket-slug>`
- **AND** the response contains the created ticket with `worktreePath` and optional `worktreeError`

#### Scenario: Delete ticket

- **WHEN** a client sends `DELETE /api/tickets/:id`
- **THEN** the ticket's git worktree is removed (if exists)
- **AND** the ticket with that ID is deleted from the database
- **AND** the response confirms success

#### Scenario: Update ticket column

- **WHEN** a client sends `PATCH /api/tickets/:id` with JSON body `{ column: string }`
- **THEN** the ticket's column is updated in the database
- **AND** the response confirms success

# kanban-board Specification

## Purpose

TBD - created by archiving change add-kanban-terminal. Update Purpose after archive.

## Requirements

### Requirement: Kanban Board Display

The system SHALL display a Kanban board with draggable columns and cards, loading tickets from the database filtered by the selected project.

#### Scenario: Board renders with columns

- **WHEN** the user navigates to the main view
- **AND** a project is selected
- **THEN** a Kanban board is displayed with columns: "To Do", "In Progress", "Done"
- **AND** tickets are loaded from the database API filtered by project

#### Scenario: Cards are draggable

- **WHEN** the user drags a card
- **THEN** the card can be moved between columns
- **AND** the column change is persisted to the database

#### Scenario: Empty board on first load

- **WHEN** the user opens the app for the first time
- **THEN** the board displays with empty columns (no default tickets)

#### Scenario: No project selected

- **WHEN** the user has not selected a project
- **THEN** the board displays an empty state prompting the user to create or select a project

### Requirement: Terminal Card Interaction

The system SHALL open a terminal session when a card is clicked and preserve sessions when switching between cards.

#### Scenario: Card opens terminal

- **WHEN** the user clicks on a card
- **THEN** a terminal interface is displayed

#### Scenario: Terminal is interactive

- **WHEN** the terminal is displayed
- **THEN** the user can type commands and see output

#### Scenario: Switching cards preserves session

- **WHEN** the user has a terminal open for card A
- **AND** the user clicks on card B
- **THEN** card A's terminal session remains active but hidden
- **AND** card B's terminal is displayed (creating a new session if first time)

#### Scenario: Returning to card restores session

- **WHEN** the user returns to a previously opened card
- **THEN** the terminal displays with full history and state preserved
- **AND** any running processes continue uninterrupted

#### Scenario: Closing panel cleans up sessions

- **WHEN** the user closes the terminal panel via the X button
- **THEN** all terminal sessions for all cards are terminated
- **AND** WebSocket connections are closed

### Requirement: WebSocket PTY Backend

The backend SHALL provide a WebSocket endpoint that spawns and manages PTY sessions with configurable working directory.

#### Scenario: Terminal connects to backend

- **WHEN** the frontend opens a terminal
- **THEN** a WebSocket connection is established to the PTY server

#### Scenario: Commands execute in shell

- **WHEN** the user types a command in the terminal
- **THEN** the command is executed in a real shell and output is streamed back

#### Scenario: Terminal uses custom working directory

- **WHEN** a WebSocket connection is established with a `cwd` query parameter
- **THEN** the PTY process spawns with that directory as the working directory

### Requirement: Ticket Creation

The system SHALL allow users to create new tickets via the UI, associated with the current project.

#### Scenario: Create ticket button

- **WHEN** the user clicks the "Add Ticket" button
- **THEN** a dialog appears to enter the ticket title

#### Scenario: Submit new ticket

- **WHEN** the user enters a title and submits the form
- **AND** a project is selected
- **THEN** a new ticket is created in the "To Do" column linked to the current project
- **AND** the ticket is persisted to the database
- **AND** the board updates to show the new ticket

#### Scenario: Terminal opens with project directory

- **WHEN** a ticket is created for a project
- **AND** the user opens the terminal for that ticket
- **THEN** the terminal automatically runs `cd <project_path>` to navigate to the project's configured directory

### Requirement: Ticket Deletion

The system SHALL allow users to delete tickets via the UI.

#### Scenario: Delete ticket button

- **WHEN** the user hovers over or selects a ticket
- **THEN** a delete button is visible

#### Scenario: Confirm and delete ticket

- **WHEN** the user clicks the delete button
- **THEN** the ticket is removed from the board
- **AND** the ticket is deleted from the database

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

### Requirement: Automatic Status Tracking API

The system SHALL provide API endpoints for Claude Code hooks to report session activity, automatically updating ticket status based on worktree path.

#### Scenario: Start tracking session

- **WHEN** a client sends `POST /api/tickets/track/start` with JSON body `{ cwd: string }`
- **AND** the `cwd` matches a ticket's `worktreePath`
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
- **THEN** the ticket's column is updated to "To Do"
- **AND** the ticket's `lastActivityAt` is set to the current timestamp
- **AND** the response contains `{ success: true, ticketId: string, title: string }`

#### Scenario: Stop tracking with no matching ticket

- **WHEN** a client sends `POST /api/tickets/track/stop` with JSON body `{ cwd: string }`
- **AND** no ticket's `worktreePath` matches the `cwd`
- **THEN** the response contains `{ success: false, error: "No ticket found for this directory" }`
- **AND** HTTP status is 404

### Requirement: Claude Code Hook Documentation

The system SHALL provide user documentation (`HOOKS.md`) with ready-to-use hook configurations for automatic ticket tracking.

#### Scenario: SessionStart hook configuration

- **WHEN** a user reads `HOOKS.md`
- **THEN** they find a JSON configuration for the `SessionStart` hook event
- **AND** the hook calls `POST /api/tickets/track/start` with the current working directory

#### Scenario: Stop hook configuration

- **WHEN** a user reads `HOOKS.md`
- **THEN** they find a JSON configuration for the `Stop` hook event
- **AND** the hook calls `POST /api/tickets/track/stop` with the current working directory

#### Scenario: Hook installation instructions

- **WHEN** a user reads `HOOKS.md`
- **THEN** they find instructions for adding hooks to:
  - User settings (`~/.claude/settings.json`)
  - Project settings (`.claude/settings.json`)

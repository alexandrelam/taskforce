## MODIFIED Requirements

### Requirement: Kanban Board Display

The system SHALL display a Kanban board with draggable columns and cards, loading tickets from the database.

#### Scenario: Board renders with columns

- **WHEN** the user navigates to the main view
- **THEN** a Kanban board is displayed with columns: "To Do", "In Progress", "Done"
- **AND** tickets are loaded from the database API

#### Scenario: Cards are draggable

- **WHEN** the user drags a card
- **THEN** the card can be moved between columns
- **AND** the column change is persisted to the database

#### Scenario: Empty board on first load

- **WHEN** the user opens the app for the first time
- **THEN** the board displays with empty columns (no default tickets)

## ADDED Requirements

### Requirement: Ticket Creation

The system SHALL allow users to create new tickets via the UI.

#### Scenario: Create ticket button

- **WHEN** the user clicks the "Add Ticket" button
- **THEN** a dialog appears to enter the ticket title

#### Scenario: Submit new ticket

- **WHEN** the user enters a title and submits the form
- **THEN** a new ticket is created in the "To Do" column
- **AND** the ticket is persisted to the database
- **AND** the board updates to show the new ticket

#### Scenario: Terminal opens with project directory

- **WHEN** a ticket is created
- **AND** a project path is configured in settings
- **AND** the user opens the terminal for that ticket
- **THEN** the terminal automatically runs `cd <project_path>` to navigate to the configured directory

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

The system SHALL provide REST API endpoints for ticket CRUD operations.

#### Scenario: List tickets

- **WHEN** a client sends `GET /api/tickets`
- **THEN** the response contains an array of all tickets with id, title, column, createdAt

#### Scenario: Create ticket

- **WHEN** a client sends `POST /api/tickets` with JSON body `{ title: string }`
- **THEN** a new ticket is created with a generated UUID and default column "To Do"
- **AND** the response contains the created ticket

#### Scenario: Delete ticket

- **WHEN** a client sends `DELETE /api/tickets/:id`
- **THEN** the ticket with that ID is deleted from the database
- **AND** the response confirms success

#### Scenario: Update ticket column

- **WHEN** a client sends `PATCH /api/tickets/:id` with JSON body `{ column: string }`
- **THEN** the ticket's column is updated in the database
- **AND** the response confirms success

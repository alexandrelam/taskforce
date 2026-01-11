## MODIFIED Requirements

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

### Requirement: Tickets API

The system SHALL provide REST API endpoints for ticket CRUD operations with project filtering.

#### Scenario: List tickets

- **WHEN** a client sends `GET /api/tickets?projectId=<id>`
- **THEN** the response contains an array of tickets filtered by project

#### Scenario: Create ticket

- **WHEN** a client sends `POST /api/tickets` with JSON body `{ title: string, projectId: string }`
- **THEN** a new ticket is created with a generated UUID and default column "To Do"
- **AND** the ticket is linked to the specified project
- **AND** the response contains the created ticket

#### Scenario: Delete ticket

- **WHEN** a client sends `DELETE /api/tickets/:id`
- **THEN** the ticket with that ID is deleted from the database
- **AND** the response confirms success

#### Scenario: Update ticket column

- **WHEN** a client sends `PATCH /api/tickets/:id` with JSON body `{ column: string }`
- **THEN** the ticket's column is updated in the database
- **AND** the response confirms success

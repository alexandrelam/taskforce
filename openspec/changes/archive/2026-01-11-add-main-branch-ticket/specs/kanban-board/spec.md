## ADDED Requirements

### Requirement: Main Branch Ticket

The system SHALL automatically create a permanent "main" ticket for each project that provides terminal access to the project's main branch directory.

#### Scenario: Auto-create main ticket on project creation

- **WHEN** a user creates a new project via `POST /api/projects`
- **THEN** a ticket with `title: "main"`, `isMain: true`, and `worktreePath: null` is automatically created
- **AND** the ticket is associated with the new project
- **AND** the ticket appears in the "To Do" column

#### Scenario: Main ticket terminal uses project path

- **WHEN** a user clicks on a main ticket to open the terminal
- **THEN** the terminal opens in the project's root path (not a worktree)
- **AND** the user can execute commands in the main branch directory

#### Scenario: Main ticket is visually differentiated

- **WHEN** the kanban board displays tickets
- **THEN** main tickets display a distinct badge or icon (e.g., branch icon with "main" label)
- **AND** the visual differentiation is clearly visible compared to regular tickets

#### Scenario: Main ticket is draggable

- **WHEN** a user drags a main ticket
- **THEN** the ticket can be moved between columns like regular tickets
- **AND** the column change is persisted to the database

#### Scenario: Main ticket cannot be deleted

- **WHEN** a user attempts to delete a main ticket via DELETE `/api/tickets/:id`
- **THEN** the API returns HTTP 403 Forbidden
- **AND** the ticket remains in the database
- **AND** the delete button is not shown on main tickets in the UI

#### Scenario: Main ticket deleted with project

- **WHEN** a user deletes a project via `DELETE /api/projects/:id`
- **THEN** the associated main ticket is deleted along with all other project tickets
- **AND** this is the only way to remove a main ticket

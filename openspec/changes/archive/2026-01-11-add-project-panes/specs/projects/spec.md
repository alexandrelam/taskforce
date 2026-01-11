## MODIFIED Requirements

### Requirement: Projects Table

The system SHALL store projects in a SQLite table with project metadata.

#### Scenario: Projects table structure

- **WHEN** the database schema is synchronized
- **THEN** a `projects` table exists with:
  - `id` (text, primary key, UUID)
  - `name` (text, not null)
  - `path` (text, not null)
  - `createdAt` (integer, not null, Unix timestamp)
  - `postWorktreeCommand` (text, nullable)
  - `panes` (text, nullable, JSON array of pane configurations)

### Requirement: Projects API

The system SHALL provide REST API endpoints for project CRUD operations.

#### Scenario: List projects

- **WHEN** a client sends `GET /api/projects`
- **THEN** the response contains an array of all projects with id, name, path, createdAt, postWorktreeCommand, panes
- **AND** the `panes` field is a parsed JSON array (or empty array if null)

#### Scenario: Create project

- **WHEN** a client sends `POST /api/projects` with JSON body `{ name: string, path: string, postWorktreeCommand?: string, panes?: Array<{ name: string }> }`
- **THEN** a new project is created with a generated UUID
- **AND** the response contains the created project including postWorktreeCommand and panes

#### Scenario: Update project

- **WHEN** a client sends `PATCH /api/projects/:id` with JSON body containing fields to update (e.g., `{ postWorktreeCommand: string, panes: Array<{ name: string }> }`)
- **THEN** the specified fields are updated in the database
- **AND** the response confirms success

#### Scenario: Delete project with cascade

- **WHEN** a client sends `DELETE /api/projects/:id`
- **THEN** all tickets associated with that project are deleted
- **AND** the project is deleted from the database
- **AND** the response confirms success

## ADDED Requirements

### Requirement: Project Pane Configuration

The system SHALL allow users to configure custom terminal panes for each project.

#### Scenario: Default pane configuration

- **WHEN** a project has no panes configured (null or empty array)
- **THEN** the system uses only the default "claude" pane

#### Scenario: Custom panes in addition to claude

- **WHEN** a project has panes configured (e.g., `[{ "name": "frontend" }, { "name": "backend" }]`)
- **THEN** tickets in that project have access to "claude" plus the configured panes
- **AND** the "claude" pane always appears first

#### Scenario: Pane name validation

- **WHEN** a user attempts to create a pane with an empty name
- **THEN** the operation is rejected
- **AND** an error message is displayed

#### Scenario: Duplicate pane name prevention

- **WHEN** a user attempts to create a pane with a name that already exists in the project
- **THEN** the operation is rejected
- **AND** an error message is displayed

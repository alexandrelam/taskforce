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

### Requirement: Projects API

The system SHALL provide REST API endpoints for project CRUD operations.

#### Scenario: List projects

- **WHEN** a client sends `GET /api/projects`
- **THEN** the response contains an array of all projects with id, name, path, createdAt, postWorktreeCommand

#### Scenario: Create project

- **WHEN** a client sends `POST /api/projects` with JSON body `{ name: string, path: string, postWorktreeCommand?: string }`
- **THEN** a new project is created with a generated UUID
- **AND** the response contains the created project including postWorktreeCommand

#### Scenario: Update project

- **WHEN** a client sends `PATCH /api/projects/:id` with JSON body containing fields to update (e.g., `{ postWorktreeCommand: string }`)
- **THEN** the specified fields are updated in the database
- **AND** the response confirms success

#### Scenario: Delete project with cascade

- **WHEN** a client sends `DELETE /api/projects/:id`
- **THEN** all tickets associated with that project are deleted
- **AND** the project is deleted from the database
- **AND** the response confirms success

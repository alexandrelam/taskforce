# projects Specification

## Purpose

TBD - created by archiving change add-projects. Update Purpose after archive.

## Requirements

### Requirement: Projects Table

The system SHALL store projects in a SQLite table with project metadata.

#### Scenario: Projects table structure

- **WHEN** the database schema is synchronized
- **THEN** a `projects` table exists with:
  - `id` (text, primary key, UUID)
  - `name` (text, not null)
  - `path` (text, not null)
  - `createdAt` (integer, not null, Unix timestamp)

### Requirement: Projects API

The system SHALL provide REST API endpoints for project CRUD operations.

#### Scenario: List projects

- **WHEN** a client sends `GET /api/projects`
- **THEN** the response contains an array of all projects with id, name, path, createdAt

#### Scenario: Create project

- **WHEN** a client sends `POST /api/projects` with JSON body `{ name: string, path: string }`
- **THEN** a new project is created with a generated UUID
- **AND** the response contains the created project

#### Scenario: Delete project with cascade

- **WHEN** a client sends `DELETE /api/projects/:id`
- **THEN** all tickets associated with that project are deleted
- **AND** the project is deleted from the database
- **AND** the response confirms success

### Requirement: Project Selection Persistence

The system SHALL persist the currently selected project in the database.

#### Scenario: Store selected project

- **WHEN** a user selects a project
- **THEN** the project ID is stored with key `selected_project` in the settings table

#### Scenario: Retrieve selected project

- **WHEN** the application loads
- **THEN** it fetches `GET /api/settings/selected_project` to restore the last selected project

### Requirement: Project Selector UI

The system SHALL provide a project selector in the main UI to switch between projects.

#### Scenario: Project dropdown in header

- **WHEN** the user views the TaskBoard
- **THEN** a dropdown selector is visible in the header showing the current project name

#### Scenario: Switching projects

- **WHEN** the user selects a different project from the dropdown
- **THEN** the kanban board updates to show only tickets from that project
- **AND** the selection is persisted to the database

#### Scenario: No project selected

- **WHEN** no project is selected or no projects exist
- **THEN** the kanban board shows an empty state prompting the user to create a project

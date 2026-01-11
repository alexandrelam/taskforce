## ADDED Requirements

### Requirement: Projects Table

The system SHALL define a projects table in `src/db/schema.ts` for storing project configurations.

#### Scenario: Projects table definition

- **WHEN** a developer inspects the database schema
- **THEN** the `projects` table is defined with:
  - `id` (text, primary key, UUID)
  - `name` (text, not null)
  - `path` (text, not null)
  - `createdAt` (integer, not null, Unix timestamp)

## MODIFIED Requirements

### Requirement: Tickets Table

The system SHALL define a tickets table in `src/db/schema.ts` for storing Kanban board tickets.

#### Scenario: Tickets table definition

- **WHEN** a developer inspects the database schema
- **THEN** the `tickets` table is defined with:
  - `id` (text, primary key, UUID)
  - `title` (text, not null)
  - `column` (text, not null, default "To Do")
  - `createdAt` (integer, not null, Unix timestamp)
  - `projectId` (text, nullable, foreign key to projects.id)

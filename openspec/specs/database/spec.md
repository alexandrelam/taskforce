# database Specification

## Purpose

TBD - created by archiving change add-sqlite-drizzle. Update Purpose after archive.

## Requirements

### Requirement: Database Client

The system SHALL provide a configured Drizzle ORM client connected to a local SQLite database file.

#### Scenario: Database initialization

- **WHEN** the server starts
- **THEN** a SQLite database file is created at `data/sqlite.db` if it does not exist
- **AND** the Drizzle client is ready for queries

#### Scenario: Type-safe queries

- **WHEN** a developer imports the database client
- **THEN** they can perform type-safe queries using Drizzle ORM syntax

### Requirement: Schema Push

The system SHALL use Drizzle Kit's `push` command for schema synchronization instead of migrations.

#### Scenario: Schema synchronization

- **WHEN** a developer runs `npm run db:push`
- **THEN** the SQLite database schema is synchronized with the schema definitions in `src/db/schema.ts`
- **AND** no migration files are generated

### Requirement: Schema Location

The system SHALL define database schemas in `src/db/schema.ts` using Drizzle ORM's SQLite schema builders.

#### Scenario: Schema file structure

- **WHEN** a developer wants to add a new table
- **THEN** they define it in `src/db/schema.ts` using `sqliteTable`
- **AND** run `npm run db:push` to apply changes

### Requirement: Settings Table

The system SHALL define a settings table in `src/db/schema.ts` for storing application configuration.

#### Scenario: Settings table definition

- **WHEN** a developer inspects the database schema
- **THEN** the `settings` table is defined with:
  - `key` (text, primary key)
  - `value` (text, not null)

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

### Requirement: Projects Table

The system SHALL define a projects table in `src/db/schema.ts` for storing project configurations.

#### Scenario: Projects table definition

- **WHEN** a developer inspects the database schema
- **THEN** the `projects` table is defined with:
  - `id` (text, primary key, UUID)
  - `name` (text, not null)
  - `path` (text, not null)
  - `createdAt` (integer, not null, Unix timestamp)

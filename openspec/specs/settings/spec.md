# settings Specification

## Purpose

TBD - created by archiving change add-project-settings. Update Purpose after archive.

## Requirements

### Requirement: Settings Storage

The system SHALL store application settings in a SQLite table as key-value pairs.

#### Scenario: Settings table structure

- **WHEN** the database schema is synchronized
- **THEN** a `settings` table exists with `key` (text, primary key) and `value` (text) columns

#### Scenario: Store project path

- **WHEN** a user saves a project path setting
- **THEN** the value is stored with key `project_path`

### Requirement: Settings API

The system SHALL provide REST API endpoints to read and write settings.

#### Scenario: Read setting

- **WHEN** a client sends `GET /api/settings/:key`
- **THEN** the response contains the value for that key or null if not set

#### Scenario: Write setting

- **WHEN** a client sends `PUT /api/settings/:key` with a JSON body containing `value`
- **THEN** the setting is stored/updated in the database
- **AND** the response confirms success

### Requirement: Settings Dialog

The system SHALL provide a settings dialog accessible from the UI with a sidebar navigation pattern.

#### Scenario: Open settings dialog

- **WHEN** the user clicks the settings button
- **THEN** a modal dialog opens with a sidebar showing settings categories

#### Scenario: Configure project path

- **WHEN** the user is in the Terminal settings section
- **THEN** they can enter a project directory path
- **AND** save it to persist the setting

### Requirement: Terminal Directory Configuration

The system SHALL use the configured project path as the working directory when spawning terminal sessions.

#### Scenario: Terminal uses project path

- **WHEN** a terminal session is opened
- **AND** a project path is configured
- **THEN** the PTY process spawns with `cwd` set to the configured path

#### Scenario: Terminal fallback to home

- **WHEN** a terminal session is opened
- **AND** no project path is configured or the path is invalid
- **THEN** the PTY process spawns with `cwd` set to the user's home directory

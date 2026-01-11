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

The system SHALL provide a settings dialog accessible from the UI with a sidebar navigation pattern, including project management.

#### Scenario: Open settings dialog

- **WHEN** the user clicks the settings button
- **THEN** a modal dialog opens with a sidebar showing settings categories

#### Scenario: Projects settings section

- **WHEN** the user is in the Projects settings section
- **THEN** they see a list of existing projects with name and path
- **AND** they can add new projects via a form
- **AND** they can delete existing projects

#### Scenario: Create project in settings

- **WHEN** the user fills in project name and path and clicks save
- **THEN** a new project is created in the database
- **AND** the projects list updates to show the new project

#### Scenario: Delete project in settings

- **WHEN** the user clicks delete on a project
- **THEN** the project and all its tickets are deleted
- **AND** the projects list updates

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

The system SHALL provide a settings dialog accessible from the UI with a sidebar navigation pattern, including project management and general settings.

#### Scenario: Settings sidebar navigation

- **WHEN** the user opens the settings dialog
- **THEN** the sidebar shows categories: "General", "Projects"
- **AND** clicking a category shows that section's content

#### Scenario: Project pane configuration in settings

- **WHEN** the user views a project in the Projects section
- **THEN** the project card shows an expandable pane configuration area
- **AND** the user can add new panes by entering a name and clicking "Add Pane"
- **AND** the user can remove existing panes by clicking a delete button next to each pane
- **AND** changes are saved immediately to the database

### Requirement: General Settings Section

The system SHALL provide a General settings section for configuring application-wide behavior.

#### Scenario: General section in settings dialog

- **WHEN** the user opens the settings dialog
- **THEN** a "General" section appears in the sidebar navigation
- **AND** clicking it shows general settings options (currently placeholder for future global settings)

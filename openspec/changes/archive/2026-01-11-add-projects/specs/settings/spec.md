## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Terminal Directory Configuration

**Reason**: Global project path is replaced by per-project paths. Terminal working directory is now derived from the project associated with each ticket.

**Migration**: Users should create projects with their desired paths instead of using the global setting.

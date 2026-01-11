## MODIFIED Requirements

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

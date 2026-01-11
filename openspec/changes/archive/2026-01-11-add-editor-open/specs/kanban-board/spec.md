## ADDED Requirements

### Requirement: Open in Editor Button

The system SHALL provide a button on each ticket card to open the ticket's worktree directory in the configured text editor.

#### Scenario: Open in editor button visible

- **WHEN** the kanban board displays a ticket
- **AND** the project has an editor configured (not "none")
- **THEN** an "Open in Editor" icon button is visible on the ticket card

#### Scenario: Open in editor button hidden when no editor

- **WHEN** the kanban board displays a ticket
- **AND** the project has no editor configured (editor is "none" or null)
- **THEN** the "Open in Editor" button is not displayed

#### Scenario: Click opens editor for regular ticket

- **WHEN** the user clicks the "Open in Editor" button on a regular ticket
- **AND** the ticket has `setupStatus: "ready"`
- **THEN** the system calls `POST /api/tickets/:id/open-editor`
- **AND** the backend spawns the configured editor with the ticket's `worktreePath` as the working directory
- **AND** a success toast is displayed

#### Scenario: Click opens editor for main ticket

- **WHEN** the user clicks the "Open in Editor" button on a main ticket
- **THEN** the system calls `POST /api/tickets/:id/open-editor`
- **AND** the backend spawns the configured editor with the project's root `path` as the working directory
- **AND** a success toast is displayed

#### Scenario: Button disabled during setup

- **WHEN** a ticket has `setupStatus` of "pending", "creating_worktree", or "running_post_command"
- **THEN** the "Open in Editor" button is disabled
- **AND** hovering shows a tooltip explaining "Ticket setup in progress"

#### Scenario: Error handling

- **WHEN** the user clicks the "Open in Editor" button
- **AND** the editor command fails to execute
- **THEN** an error toast is displayed with the failure reason

### Requirement: Open Editor API

The system SHALL provide an API endpoint to launch the configured editor for a ticket's directory.

#### Scenario: Open editor endpoint

- **WHEN** a client sends `POST /api/tickets/:id/open-editor`
- **THEN** the system looks up the ticket and its associated project
- **AND** determines the directory path (worktreePath for regular tickets, project path for main tickets)
- **AND** spawns the editor process with the directory path
- **AND** responds with `{ success: true }`

#### Scenario: Open editor with missing editor config

- **WHEN** a client sends `POST /api/tickets/:id/open-editor`
- **AND** the project has no editor configured
- **THEN** the response contains `{ success: false, error: "No editor configured for this project" }`
- **AND** HTTP status is 400

#### Scenario: Open editor with invalid ticket

- **WHEN** a client sends `POST /api/tickets/:id/open-editor`
- **AND** the ticket does not exist
- **THEN** the response contains `{ success: false, error: "Ticket not found" }`
- **AND** HTTP status is 404

#### Scenario: Editor command mapping

- **WHEN** the backend needs to launch an editor
- **THEN** it uses the following command mapping:
  - "vscode" -> `code <path>`
  - "cursor" -> `cursor <path>`
  - "neovim" -> opens a new terminal window with `nvim <path>`
  - "intellij" -> `idea <path>`

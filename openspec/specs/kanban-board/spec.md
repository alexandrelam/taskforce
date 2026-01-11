# kanban-board Specification

## Purpose

TBD - created by archiving change add-kanban-terminal. Update Purpose after archive.

## Requirements

### Requirement: Kanban Board Display

The system SHALL display a Kanban board with draggable columns and cards, loading tickets from the database filtered by the selected project.

#### Scenario: Board renders with columns

- **WHEN** the user navigates to the main view
- **AND** a project is selected
- **THEN** a Kanban board is displayed with columns: "To Do", "In Progress", "Done"
- **AND** tickets are loaded from the database API filtered by project

#### Scenario: Cards are draggable

- **WHEN** the user drags a card
- **THEN** the card can be moved between columns
- **AND** the column change is persisted to the database

#### Scenario: Empty board on first load

- **WHEN** the user opens the app for the first time
- **THEN** the board displays with empty columns (no default tickets)

#### Scenario: No project selected

- **WHEN** the user has not selected a project
- **THEN** the board displays an empty state prompting the user to create or select a project

### Requirement: Terminal Card Interaction

The system SHALL open a terminal session when a card is clicked and preserve sessions when switching between cards.

#### Scenario: Card opens terminal

- **WHEN** the user clicks on a card
- **THEN** a terminal interface is displayed

#### Scenario: Terminal is interactive

- **WHEN** the terminal is displayed
- **THEN** the user can type commands and see output

#### Scenario: Switching cards preserves session

- **WHEN** the user has a terminal open for card A
- **AND** the user clicks on card B
- **THEN** card A's terminal session remains active but hidden
- **AND** card B's terminal is displayed (creating a new session if first time)

#### Scenario: Returning to card restores session

- **WHEN** the user returns to a previously opened card
- **THEN** the terminal displays with full history and state preserved
- **AND** any running processes continue uninterrupted

#### Scenario: Closing panel cleans up sessions

- **WHEN** the user closes the terminal panel via the X button
- **THEN** all terminal sessions for all cards are terminated
- **AND** WebSocket connections are closed

### Requirement: WebSocket PTY Backend

The backend SHALL provide a WebSocket endpoint that spawns and manages PTY sessions with configurable working directory.

#### Scenario: Terminal connects to backend

- **WHEN** the frontend opens a terminal
- **THEN** a WebSocket connection is established to the PTY server

#### Scenario: Commands execute in shell

- **WHEN** the user types a command in the terminal
- **THEN** the command is executed in a real shell and output is streamed back

#### Scenario: Terminal uses custom working directory

- **WHEN** a WebSocket connection is established with a `cwd` query parameter
- **THEN** the PTY process spawns with that directory as the working directory

### Requirement: Ticket Creation

The system SHALL allow users to create new tickets via the UI, associated with the current project, with non-blocking asynchronous setup and optional description.

#### Scenario: Create ticket button

- **WHEN** the user clicks the "Add Ticket" button
- **THEN** a dialog appears to enter the ticket title and optional description

#### Scenario: Submit new ticket

- **WHEN** the user enters a title and submits the form
- **AND** a project is selected
- **THEN** a new ticket is created in the "To Do" column linked to the current project
- **AND** the ticket is persisted to the database with `setupStatus: "pending"` and optional `description`
- **AND** the dialog closes immediately (does not wait for setup to complete)
- **AND** the board updates to show the new ticket with a setup indicator

#### Scenario: Submit ticket with description

- **WHEN** the user enters a title and description and submits the form
- **AND** a project is selected
- **THEN** a new ticket is created with the provided description
- **AND** the description is persisted to the database

#### Scenario: Terminal opens with project directory

- **WHEN** a ticket is created for a project
- **AND** the user opens the terminal for that ticket
- **AND** the ticket's `setupStatus` is "ready"
- **THEN** the terminal automatically runs `cd <project_path>` to navigate to the project's configured directory

### Requirement: Ticket Deletion

The system SHALL allow users to delete tickets via the UI with visual feedback during the deletion operation and a confirmation dialog to prevent accidental deletions.

#### Scenario: Delete ticket button

- **WHEN** the user hovers over or selects a ticket
- **THEN** a delete button is visible

#### Scenario: Delete confirmation dialog appears

- **WHEN** the user clicks the delete button
- **THEN** a confirmation dialog appears asking "Are you sure you want to delete this ticket?"
- **AND** the dialog displays the ticket title for clarity
- **AND** the dialog has "Cancel" and "Delete" buttons

#### Scenario: Cancel deletion

- **WHEN** the confirmation dialog is shown
- **AND** the user clicks "Cancel" or presses Escape
- **THEN** the dialog closes
- **AND** the ticket remains unchanged

#### Scenario: Confirm and delete ticket

- **WHEN** the confirmation dialog is shown
- **AND** the user clicks "Delete" to confirm
- **THEN** the delete button displays a spinner/loading indicator
- **AND** the delete button is disabled to prevent additional clicks
- **AND** the ticket is removed from the board
- **AND** the ticket is deleted from the database

#### Scenario: Loading state clears after deletion

- **WHEN** the delete operation completes (success or failure)
- **THEN** the loading indicator is removed
- **AND** the button returns to its normal state (if ticket still exists due to error)

### Requirement: Tickets API

The system SHALL provide REST API endpoints for ticket CRUD operations with project filtering, worktree management, post-worktree command execution, and optional description field.

#### Scenario: Create ticket returns immediately

- **WHEN** a client sends `POST /api/tickets` with JSON body `{ title: string, projectId: string, description?: string }`
- **THEN** the API responds immediately (within 100ms) with HTTP 201
- **AND** the response includes `setupStatus: "pending"` and `description` if provided
- **AND** worktree creation and post-worktree command run asynchronously in the background

#### Scenario: Background setup updates status

- **WHEN** a ticket is created with `setupStatus: "pending"`
- **THEN** the system updates `setupStatus` to "creating_worktree" when starting worktree creation
- **AND** updates `setupStatus` to "running_post_command" when running the post-worktree command
- **AND** updates `setupStatus` to "ready" when all setup completes successfully
- **AND** updates `setupLogs` with command output as it becomes available

#### Scenario: Background setup failure

- **WHEN** worktree creation or post-worktree command fails during background setup
- **THEN** the system updates `setupStatus` to "failed"
- **AND** sets `setupError` with the error message
- **AND** the ticket remains in the database (not rolled back)

#### Scenario: Post-worktree command skipped when no command configured

- **WHEN** a ticket is created
- **AND** the project's `worktree_post_command` setting is empty or not set
- **THEN** the system transitions directly from "creating_worktree" to "ready"

#### Scenario: Update ticket description

- **WHEN** a client sends `PATCH /api/tickets/:id` with JSON body `{ description: string }`
- **THEN** the ticket's description is updated
- **AND** the API responds with `{ success: true }`

### Requirement: Automatic Status Tracking API

The system SHALL provide API endpoints for Claude Code hooks to report session activity, automatically updating ticket status based on worktree path, respecting manual overrides.

#### Scenario: Start tracking session

- **WHEN** a client sends `POST /api/tickets/track/start` with JSON body `{ cwd: string }`
- **AND** the `cwd` matches a ticket's `worktreePath`
- **AND** the ticket does NOT have `statusOverride: true`
- **THEN** the ticket's column is updated to "In Progress"
- **AND** the ticket's `lastActivityAt` is set to the current timestamp
- **AND** the response contains `{ success: true, ticketId: string, title: string }`

#### Scenario: Start tracking with no matching ticket

- **WHEN** a client sends `POST /api/tickets/track/start` with JSON body `{ cwd: string }`
- **AND** no ticket's `worktreePath` matches the `cwd`
- **THEN** the response contains `{ success: false, error: "No ticket found for this directory" }`
- **AND** HTTP status is 404

#### Scenario: Stop tracking session

- **WHEN** a client sends `POST /api/tickets/track/stop` with JSON body `{ cwd: string }`
- **AND** the `cwd` matches a ticket's `worktreePath`
- **AND** the ticket does NOT have `statusOverride: true`
- **THEN** the ticket's column is updated to "To Do"
- **AND** the ticket's `lastActivityAt` is set to the current timestamp
- **AND** the response contains `{ success: true, ticketId: string, title: string }`

#### Scenario: Stop tracking with no matching ticket

- **WHEN** a client sends `POST /api/tickets/track/stop` with JSON body `{ cwd: string }`
- **AND** no ticket's `worktreePath` matches the `cwd`
- **THEN** the response contains `{ success: false, error: "No ticket found for this directory" }`
- **AND** HTTP status is 404

### Requirement: Claude Code Hook Documentation

The system SHALL provide user documentation (`HOOKS.md`) with ready-to-use hook configurations for automatic ticket tracking.

#### Scenario: SessionStart hook configuration

- **WHEN** a user reads `HOOKS.md`
- **THEN** they find a JSON configuration for the `SessionStart` hook event
- **AND** the hook calls `POST /api/tickets/track/start` with the current working directory

#### Scenario: Stop hook configuration

- **WHEN** a user reads `HOOKS.md`
- **THEN** they find a JSON configuration for the `Stop` hook event
- **AND** the hook calls `POST /api/tickets/track/stop` with the current working directory

#### Scenario: Hook installation instructions

- **WHEN** a user reads `HOOKS.md`
- **THEN** they find instructions for adding hooks to:
  - User settings (`~/.claude/settings.json`)
  - Project settings (`.claude/settings.json`)

### Requirement: Main Branch Ticket

The system SHALL automatically create a permanent "main" ticket for each project that provides terminal access to the project's main branch directory.

#### Scenario: Auto-create main ticket on project creation

- **WHEN** a user creates a new project via `POST /api/projects`
- **THEN** a ticket with `title: "main"`, `isMain: true`, and `worktreePath: null` is automatically created
- **AND** the ticket is associated with the new project
- **AND** the ticket appears in the "To Do" column

#### Scenario: Main ticket terminal uses project path

- **WHEN** a user clicks on a main ticket to open the terminal
- **THEN** the terminal opens in the project's root path (not a worktree)
- **AND** the user can execute commands in the main branch directory

#### Scenario: Main ticket is visually differentiated

- **WHEN** the kanban board displays tickets
- **THEN** main tickets display a distinct badge or icon (e.g., branch icon with "main" label)
- **AND** the visual differentiation is clearly visible compared to regular tickets

#### Scenario: Main ticket is draggable

- **WHEN** a user drags a main ticket
- **THEN** the ticket can be moved between columns like regular tickets
- **AND** the column change is persisted to the database

#### Scenario: Main ticket cannot be deleted

- **WHEN** a user attempts to delete a main ticket via DELETE `/api/tickets/:id`
- **THEN** the API returns HTTP 403 Forbidden
- **AND** the ticket remains in the database
- **AND** the delete button is not shown on main tickets in the UI

#### Scenario: Main ticket deleted with project

- **WHEN** a user deletes a project via `DELETE /api/projects/:id`
- **THEN** the associated main ticket is deleted along with all other project tickets
- **AND** this is the only way to remove a main ticket

### Requirement: Ticket Setup Status Display

The system SHALL display visual indicators for tickets that are being set up or have failed setup.

#### Scenario: Pending ticket indicator

- **WHEN** a ticket has `setupStatus` of "pending", "creating_worktree", or "running_post_command"
- **THEN** the ticket card displays a spinner or loading indicator
- **AND** shows the current setup step (e.g., "Creating worktree...", "Installing dependencies...")

#### Scenario: Failed ticket indicator

- **WHEN** a ticket has `setupStatus` of "failed"
- **THEN** the ticket card displays an error indicator (e.g., red badge or icon)
- **AND** hovering or clicking shows the error message

#### Scenario: Clicking pending ticket shows progress

- **WHEN** the user clicks on a ticket with `setupStatus` not "ready"
- **THEN** instead of opening the terminal, a panel shows setup progress
- **AND** displays the `setupLogs` content if available
- **AND** displays the `setupError` if status is "failed"

#### Scenario: Ready ticket opens terminal normally

- **WHEN** the user clicks on a ticket with `setupStatus: "ready"`
- **THEN** the terminal opens normally as before

### Requirement: Ticket Description Display

The system SHALL display ticket descriptions on kanban cards to provide context about the task.

#### Scenario: Description shown on card

- **WHEN** a ticket has a description
- **THEN** the description is displayed below the ticket title on the kanban card
- **AND** long descriptions are truncated to prevent card overflow

#### Scenario: No description on card

- **WHEN** a ticket has no description (null or empty)
- **THEN** only the ticket title is displayed on the kanban card
- **AND** no extra space is reserved for the missing description

### Requirement: Manual Status Override

The system SHALL allow users to manually override automatic status tracking by dragging tickets between columns, preserving the manual status until explicitly cleared.

#### Scenario: Manual drag sets override

- **WHEN** a user drags a ticket from one column to another
- **THEN** the ticket's `statusOverride` is set to `true`
- **AND** the ticket's column is updated to the target column
- **AND** the change is persisted to the database

#### Scenario: Override blocks automatic tracking start

- **WHEN** a client sends `POST /api/tickets/track/start` with JSON body `{ cwd: string }`
- **AND** the matching ticket has `statusOverride: true`
- **THEN** the ticket's column is NOT updated
- **AND** the response contains `{ success: false, error: "Ticket has manual status override", ticketId: string }`
- **AND** HTTP status is 409 Conflict

#### Scenario: Override blocks automatic tracking stop

- **WHEN** a client sends `POST /api/tickets/track/stop` with JSON body `{ cwd: string }`
- **AND** the matching ticket has `statusOverride: true`
- **THEN** the ticket's column is NOT updated
- **AND** the response contains `{ success: false, error: "Ticket has manual status override", ticketId: string }`
- **AND** HTTP status is 409 Conflict

#### Scenario: Clear override via API

- **WHEN** a client sends `PATCH /api/tickets/:id/clear-override`
- **THEN** the ticket's `statusOverride` is set to `false`
- **AND** the response contains `{ success: true }`
- **AND** automatic tracking can now update the ticket

#### Scenario: Override indicator in UI

- **WHEN** a ticket has `statusOverride: true`
- **THEN** the ticket card displays a visual indicator (e.g., lock icon or badge)
- **AND** hovering shows tooltip explaining "Manual status - automatic tracking disabled"

#### Scenario: Clear override from UI

- **WHEN** a user clicks the override indicator on a ticket with `statusOverride: true`
- **THEN** a button or action appears to clear the override
- **AND** clicking it calls `PATCH /api/tickets/:id/clear-override`
- **AND** the visual indicator is removed after clearing

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

### Requirement: Open Existing Branch

The system SHALL allow users to create tickets from existing local or remote branches by typing a branch name, creating a worktree for that branch.

#### Scenario: Open branch button visible

- **WHEN** a project is selected
- **THEN** an "Open Branch" button is visible next to the "Add Ticket" button

#### Scenario: Open branch button disabled when no project

- **WHEN** no project is selected
- **THEN** the "Open Branch" button is disabled

#### Scenario: Open branch dialog

- **WHEN** the user clicks the "Open Branch" button
- **THEN** a dialog appears with a text input for the branch name
- **AND** an optional description field
- **AND** a submit button

#### Scenario: Submit with valid branch name

- **WHEN** the user enters a branch name and submits
- **AND** the branch exists locally or on remote
- **THEN** a new ticket is created with `setupStatus: "pending"`
- **AND** the dialog closes immediately (does not wait for setup)
- **AND** the worktree is created from the specified branch in the background

#### Scenario: Submit with non-existent branch

- **WHEN** the user enters a branch name and submits
- **AND** the branch does not exist locally or on remote
- **THEN** the ticket's `setupStatus` is set to "failed"
- **AND** the `setupError` contains the branch not found error

#### Scenario: Ticket title defaults to branch name

- **WHEN** a ticket is created from an existing branch
- **THEN** the ticket title is set to the branch name

### Requirement: Worktree from Existing Branch API

The backend SHALL provide an API endpoint to create tickets from existing branches, reusing the async setup flow.

#### Scenario: Create ticket from branch endpoint

- **WHEN** a client sends `POST /api/tickets/from-branch` with JSON body `{ branchName: string, projectId: string, description?: string }`
- **THEN** the API responds immediately (within 100ms) with HTTP 201
- **AND** the response includes `setupStatus: "pending"`
- **AND** worktree creation runs asynchronously in the background

#### Scenario: Worktree created from branch

- **WHEN** background setup starts for a branch-based ticket
- **THEN** the system creates a worktree using the specified branch as the base
- **AND** uses the branch name as the worktree directory name suffix
- **AND** does NOT create a new branch (uses existing branch)

#### Scenario: Post-worktree command runs after branch worktree

- **WHEN** a worktree is created from an existing branch
- **AND** the project has a `postWorktreeCommand` configured
- **THEN** the command runs in the new worktree directory
- **AND** status updates follow the same flow as new ticket creation

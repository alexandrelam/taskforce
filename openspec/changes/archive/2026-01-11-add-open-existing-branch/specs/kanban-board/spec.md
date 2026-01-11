## ADDED Requirements

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

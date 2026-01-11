# kanban-board Spec Delta

## MODIFIED Requirements

### Requirement: Tickets API

The system SHALL provide REST API endpoints for ticket CRUD operations with project filtering, worktree management, and post-worktree command execution.

#### Scenario: Create ticket with post-worktree command

- **WHEN** a client sends `POST /api/tickets` with JSON body `{ title: string, projectId: string }`
- **AND** a git worktree is successfully created
- **AND** the `worktree_post_command` setting is configured (non-empty)
- **THEN** the command is executed in the worktree directory
- **AND** the response includes `postCommandOutput` (stdout) and `postCommandError` (error message if failed)

#### Scenario: Create ticket without post-worktree command

- **WHEN** a client sends `POST /api/tickets` with JSON body `{ title: string, projectId: string }`
- **AND** the `worktree_post_command` setting is empty or not set
- **THEN** no command is executed after worktree creation
- **AND** the response does not include `postCommandOutput` or `postCommandError` fields

#### Scenario: Post-worktree command failure

- **WHEN** a client sends `POST /api/tickets`
- **AND** a worktree is created successfully
- **AND** the post-worktree command fails (non-zero exit code)
- **THEN** the ticket is still created successfully
- **AND** the response includes `postCommandError` with the error details
- **AND** the worktree remains intact (not rolled back)

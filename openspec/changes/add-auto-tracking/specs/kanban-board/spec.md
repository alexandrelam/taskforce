## ADDED Requirements

### Requirement: Automatic Status Tracking API

The system SHALL provide API endpoints for Claude Code hooks to report session activity, automatically updating ticket status based on worktree path.

#### Scenario: Start tracking session

- **WHEN** a client sends `POST /api/tickets/track/start` with JSON body `{ cwd: string }`
- **AND** the `cwd` matches a ticket's `worktreePath`
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

# terminal-persistence Specification

## Purpose

TBD - created by archiving change add-tmux-session-persistence. Update Purpose after archive.

## Requirements

### Requirement: tmux Detection

The system SHALL detect tmux availability at server startup and expose this status.

#### Scenario: tmux is installed

- **WHEN** the server starts
- **AND** tmux binary is available in PATH
- **THEN** tmux support is enabled for terminal sessions

#### Scenario: tmux is not installed

- **WHEN** the server starts
- **AND** tmux binary is not found
- **THEN** tmux support is disabled
- **AND** terminal sessions use direct shell spawn (existing behavior)

### Requirement: Session Persistence

The system SHALL use tmux to persist terminal sessions when a session ID is provided and tmux is available.

#### Scenario: New session with ID

- **WHEN** a WebSocket connection is made to `/pty?sessionId=abc123`
- **AND** tmux is available
- **AND** no tmux session named `abc123` exists
- **THEN** a new tmux session is created with name `abc123`
- **AND** the terminal is connected to that session

#### Scenario: Reconnect to existing session

- **WHEN** a WebSocket connection is made to `/pty?sessionId=abc123`
- **AND** tmux is available
- **AND** a tmux session named `abc123` already exists
- **THEN** the terminal attaches to the existing session
- **AND** previous output and state are preserved

#### Scenario: Session survives server restart

- **WHEN** a tmux session `abc123` is active
- **AND** the server restarts
- **AND** a client reconnects with `sessionId=abc123`
- **THEN** the client attaches to the existing tmux session
- **AND** command history and running processes are preserved

#### Scenario: Fallback without session ID

- **WHEN** a WebSocket connection is made to `/pty` without sessionId
- **THEN** the system spawns a direct shell (not tmux)
- **AND** behavior matches pre-persistence implementation

### Requirement: tmux Status API

The system SHALL provide an API endpoint to query tmux availability.

#### Scenario: Query tmux status

- **WHEN** a client sends `GET /api/tmux/status`
- **THEN** the response contains `{ "available": boolean }`

### Requirement: Session Cleanup

The system SHALL delete tmux sessions when their associated ticket is deleted.

#### Scenario: Delete ticket with active tmux session

- **WHEN** a ticket is deleted via `DELETE /api/tickets/:id`
- **AND** a tmux session exists with a name derived from the ticket ID
- **THEN** the tmux session is killed

#### Scenario: Delete ticket without tmux session

- **WHEN** a ticket is deleted via `DELETE /api/tickets/:id`
- **AND** no tmux session exists for that ticket
- **THEN** the deletion completes without error

#### Scenario: Delete ticket when tmux unavailable

- **WHEN** a ticket is deleted via `DELETE /api/tickets/:id`
- **AND** tmux is not available on the system
- **THEN** the deletion completes without error

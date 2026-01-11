## MODIFIED Requirements

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

#### Scenario: Pane-specific session naming

- **WHEN** a WebSocket connection is made with `sessionId={ticketId}-{paneName}` (e.g., `abc123-frontend`)
- **AND** tmux is available
- **THEN** a tmux session is created/attached with that combined name
- **AND** each pane for a ticket has its own independent session

### Requirement: Session Cleanup

The system SHALL delete tmux sessions when their associated ticket is deleted.

#### Scenario: Delete ticket with active tmux sessions

- **WHEN** a ticket is deleted via `DELETE /api/tickets/:id`
- **AND** tmux sessions exist for the ticket (pattern `{ticketId}*`)
- **THEN** all tmux sessions matching the ticket ID prefix are killed

#### Scenario: Delete ticket without tmux session

- **WHEN** a ticket is deleted via `DELETE /api/tickets/:id`
- **AND** no tmux session exists for that ticket
- **THEN** the deletion completes without error

#### Scenario: Delete ticket when tmux unavailable

- **WHEN** a ticket is deleted via `DELETE /api/tickets/:id`
- **AND** tmux is not available on the system
- **THEN** the deletion completes without error

## ADDED Requirements

### Requirement: Multi-Pane Terminal UI

The system SHALL display terminal panes as tabs within the terminal panel.

#### Scenario: Tab display for panes

- **WHEN** the user opens a terminal for a ticket
- **AND** the project has custom panes configured
- **THEN** horizontal tabs appear above the terminal showing "claude" and each custom pane name
- **AND** the "claude" tab is always first

#### Scenario: Tab switching

- **WHEN** the user clicks on a different pane tab
- **THEN** the terminal switches to show that pane's session
- **AND** the previous pane's session remains active in the background

#### Scenario: Lazy session creation

- **WHEN** the user clicks on a pane tab for the first time
- **THEN** a new tmux session is created for that pane
- **AND** the session is not created until the tab is clicked

#### Scenario: Default pane on ticket open

- **WHEN** the user clicks on a ticket to open the terminal
- **THEN** the "claude" pane is displayed by default
- **AND** no other pane sessions are created until explicitly selected

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Kanban Board Display

The system SHALL display a Kanban board with draggable columns and cards.

#### Scenario: Board renders with columns

- **WHEN** the user navigates to the main view
- **THEN** a Kanban board is displayed with at least one column

#### Scenario: Cards are draggable

- **WHEN** the user drags a card
- **THEN** the card can be moved between columns

### Requirement: Terminal Card Interaction

The system SHALL open a terminal session when a card is clicked.

#### Scenario: Card opens terminal

- **WHEN** the user clicks on a card
- **THEN** a terminal interface is displayed

#### Scenario: Terminal is interactive

- **WHEN** the terminal is displayed
- **THEN** the user can type commands and see output

### Requirement: WebSocket PTY Backend

The backend SHALL provide a WebSocket endpoint that spawns and manages PTY sessions.

#### Scenario: Terminal connects to backend

- **WHEN** the frontend opens a terminal
- **THEN** a WebSocket connection is established to the PTY server

#### Scenario: Commands execute in shell

- **WHEN** the user types a command in the terminal
- **THEN** the command is executed in a real shell and output is streamed back

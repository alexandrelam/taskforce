# kanban-board Specification

## Purpose

TBD - created by archiving change add-kanban-terminal. Update Purpose after archive.

## Requirements

### Requirement: Kanban Board Display

The system SHALL display a Kanban board with draggable columns and cards.

#### Scenario: Board renders with columns

- **WHEN** the user navigates to the main view
- **THEN** a Kanban board is displayed with at least one column

#### Scenario: Cards are draggable

- **WHEN** the user drags a card
- **THEN** the card can be moved between columns

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

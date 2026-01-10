## MODIFIED Requirements

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

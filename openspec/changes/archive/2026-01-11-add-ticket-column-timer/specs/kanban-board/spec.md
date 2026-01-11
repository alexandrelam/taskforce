## ADDED Requirements

### Requirement: Ticket Column Timer

The system SHALL display an elapsed time indicator on each ticket card showing how long the ticket has been in its current column within the current browser session.

#### Scenario: Timer displays on ticket cards

- **WHEN** the kanban board renders a ticket card
- **THEN** an elapsed time indicator is displayed on the card (e.g., "2m", "1h 30m")
- **AND** the timer updates in real-time as time passes

#### Scenario: Timer starts at zero on initial load

- **WHEN** the user loads the kanban board for the first time in a session
- **THEN** all ticket timers start at 0:00
- **AND** begin counting up from that moment

#### Scenario: Timer resets when ticket moves to different column

- **WHEN** a ticket is dragged from one column to another
- **THEN** the timer for that ticket resets to 0:00
- **AND** begins counting up from the moment of the column change

#### Scenario: Timer does not persist across page refresh

- **WHEN** the user refreshes the page
- **THEN** all ticket timers reset to 0:00
- **AND** begin counting up from the page load time

#### Scenario: Timer format for short durations

- **WHEN** a ticket has been in its column for less than 60 minutes
- **THEN** the timer displays in minutes format (e.g., "5m", "45m")

#### Scenario: Timer format for long durations

- **WHEN** a ticket has been in its column for 60 minutes or more
- **THEN** the timer displays in hours and minutes format (e.g., "1h 30m", "2h 0m")

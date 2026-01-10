## ADDED Requirements

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

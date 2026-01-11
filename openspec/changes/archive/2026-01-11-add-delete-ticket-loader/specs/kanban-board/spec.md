## MODIFIED Requirements

### Requirement: Ticket Deletion

The system SHALL allow users to delete tickets via the UI with visual feedback during the deletion operation.

#### Scenario: Delete ticket button

- **WHEN** the user hovers over or selects a ticket
- **THEN** a delete button is visible

#### Scenario: Delete button shows loading state

- **WHEN** the user clicks the delete button
- **THEN** the delete button displays a spinner/loading indicator
- **AND** the delete button is disabled to prevent additional clicks

#### Scenario: Confirm and delete ticket

- **WHEN** the user clicks the delete button
- **THEN** the ticket is removed from the board
- **AND** the ticket is deleted from the database

#### Scenario: Loading state clears after deletion

- **WHEN** the delete operation completes (success or failure)
- **THEN** the loading indicator is removed
- **AND** the button returns to its normal state (if ticket still exists due to error)

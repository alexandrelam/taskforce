## MODIFIED Requirements

### Requirement: Ticket Deletion

The system SHALL allow users to delete tickets via the UI with visual feedback during the deletion operation and a confirmation dialog to prevent accidental deletions.

#### Scenario: Delete ticket button

- **WHEN** the user hovers over or selects a ticket
- **THEN** a delete button is visible

#### Scenario: Delete confirmation dialog appears

- **WHEN** the user clicks the delete button
- **THEN** a confirmation dialog appears asking "Are you sure you want to delete this ticket?"
- **AND** the dialog displays the ticket title for clarity
- **AND** the dialog has "Cancel" and "Delete" buttons

#### Scenario: Cancel deletion

- **WHEN** the confirmation dialog is shown
- **AND** the user clicks "Cancel" or presses Escape
- **THEN** the dialog closes
- **AND** the ticket remains unchanged

#### Scenario: Confirm and delete ticket

- **WHEN** the confirmation dialog is shown
- **AND** the user clicks "Delete" to confirm
- **THEN** the delete button displays a spinner/loading indicator
- **AND** the delete button is disabled to prevent additional clicks
- **AND** the ticket is removed from the board
- **AND** the ticket is deleted from the database

#### Scenario: Loading state clears after deletion

- **WHEN** the delete operation completes (success or failure)
- **THEN** the loading indicator is removed
- **AND** the button returns to its normal state (if ticket still exists due to error)

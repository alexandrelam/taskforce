# Change: Add loading state to delete ticket button

## Why

When deleting a ticket, multiple operations happen (API call, state updates, potential panel close). During this time, users receive no visual feedback that the deletion is in progress, leading to potential confusion or accidental double-clicks.

## What Changes

- Add loading state tracking for ticket deletion
- Show a spinner/loader on the delete button while deletion is in progress
- Disable the delete button during the deletion operation to prevent double-clicks

## Impact

- Affected specs: kanban-board
- Affected code: `web/src/components/TaskBoard.tsx`

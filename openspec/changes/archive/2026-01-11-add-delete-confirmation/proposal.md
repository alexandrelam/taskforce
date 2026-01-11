# Change: Add Delete Confirmation Dialog

## Why

Currently, clicking the delete button on a ticket immediately deletes it without any confirmation. This can lead to accidental data loss if users click the delete button unintentionally.

## What Changes

- Add an "Are you sure?" confirmation dialog before deleting tickets
- User must confirm the deletion before the ticket is actually removed
- Cancel option to abort the deletion

## Impact

- Affected specs: `kanban-board`
- Affected code: `web/src/components/TaskBoard.tsx`, will add `alert-dialog` shadcn component

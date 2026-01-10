# Change: Cleanup tmux Sessions on Ticket Delete

## Why

When a ticket is deleted, its associated tmux session continues running indefinitely. This leads to orphaned tmux sessions that consume system resources and clutter the tmux session list.

## What Changes

- Delete the associated tmux session when a ticket is deleted
- Add a utility function to kill tmux sessions by ID
- Export the session ID sanitization function for consistent naming

## Impact

- Affected specs: `terminal-persistence`
- Affected code: `src/pty.ts`, `src/index.ts`

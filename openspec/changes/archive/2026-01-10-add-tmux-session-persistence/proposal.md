# Change: Add tmux-based terminal session persistence

## Why

Currently, terminal sessions are lost when the server restarts or the browser page is reloaded. Users lose their command history, running processes, and working state. By leveraging tmux (when available), sessions can survive these events and be reattached.

## What Changes

- Backend detects tmux availability at startup
- PTY spawns attach to named tmux sessions instead of raw shell processes (when tmux is available)
- Sessions are identified by a unique session ID (e.g., ticket ID or client-provided ID)
- Frontend reconnects to existing tmux session on page reload
- Graceful fallback to current behavior when tmux is not available

## Impact

- Affected specs: New `terminal-persistence` capability; modifies `kanban-board` (WebSocket PTY Backend requirement)
- Affected code: `src/pty.ts`, `web/src/components/Terminal.tsx`

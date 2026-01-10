## Context

The current PTY implementation spawns a fresh shell for each WebSocket connection. When the server restarts or the client disconnects, all session state (history, running processes, environment) is lost. tmux is a terminal multiplexer that can maintain sessions independently of the connecting client.

## Goals / Non-Goals

**Goals:**

- Sessions survive server restarts and page reloads
- Transparent reconnection to existing sessions
- Graceful fallback when tmux is unavailable
- Minimal changes to existing architecture

**Non-Goals:**

- Session sharing between multiple users
- Manual tmux configuration UI
- Session timeout/cleanup policies (can be added later)

## Decisions

### Decision: Use tmux named sessions keyed by session ID

The backend will spawn `tmux new-session -A -s <session-id>` which creates a new session or attaches to an existing one with that name. Session IDs will be provided by the client (e.g., ticket ID).

**Alternatives considered:**

1. **Screen instead of tmux**: tmux has better API, more modern, widely installed
2. **Server-side session storage**: Would require implementing our own persistence layer
3. **Per-user session pools**: Over-engineering for current needs

### Decision: Client provides session ID via query parameter

The WebSocket connection will accept an optional `sessionId` query parameter. If provided and tmux is available, the backend attaches to that tmux session. This allows the frontend to reconnect to the same session.

**Format:** `/pty?sessionId=<id>&cwd=<path>`

### Decision: Detect tmux availability once at startup

Check for tmux binary existence and version at server start. Store result in module-level variable. This avoids checking on every connection.

### Decision: Fallback to raw shell when tmux unavailable

When tmux is not detected, the system behaves exactly as it does today. No user-facing error; the feature is simply disabled.

## Risks / Trade-offs

| Risk                              | Mitigation                                                     |
| --------------------------------- | -------------------------------------------------------------- |
| Orphaned tmux sessions accumulate | Future enhancement: session cleanup on server start or via API |
| tmux version incompatibilities    | Test against common versions (3.0+); use basic flags only      |
| Session ID collisions             | Use ticket IDs which are UUIDs; document naming convention     |

## Migration Plan

No migration needed. The change is additive and backward-compatible. Existing terminals will work unchanged; persistence activates automatically when tmux is available and sessionId is provided.

## Open Questions

None currently. The implementation is straightforward.

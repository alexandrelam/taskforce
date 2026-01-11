## Context

The application currently supports one terminal session per ticket, always named "claude". Users working on full-stack projects need multiple terminals (e.g., frontend dev server, backend server, database, logs) per ticket. This change adds project-level pane configuration.

## Goals / Non-Goals

- Goals:
  - Allow users to configure custom panes per project in settings
  - Show tabs in the terminal panel to switch between panes
  - Always include a "claude" pane that cannot be removed
  - Persist each pane as a separate tmux session for reconnection

- Non-Goals:
  - Automatic command execution when panes open (future work)
  - tmux split panes within the UI (we use tabs instead)
  - Per-ticket pane configuration (keeping it simple at project level)

## Decisions

### Pane Storage Format

- Decision: Store panes as a JSON array in a `panes` column on the `projects` table
- Format: `[{ "name": "frontend" }, { "name": "backend" }]`
- Alternatives considered:
  - Separate `panes` table with foreign key: More normalized but adds complexity for a simple list
  - Settings key-value: Doesn't associate panes with specific projects

### Session Naming Convention

- Decision: Use `{ticketId}-{paneName}` for tmux session names (e.g., `abc123-claude`, `abc123-frontend`)
- This allows multiple panes per ticket while maintaining session persistence
- The `sanitizeSessionId` function will be extended to handle the combined name

### Tab UI Approach

- Decision: Add horizontal tabs above the terminal in the terminal panel
- "claude" tab always appears first and cannot be removed
- Additional panes appear in the order they were configured
- Active tab is visually highlighted

### Lazy Session Creation

- Decision: Only create tmux sessions when the user actually clicks on a pane tab
- Rationale: Avoids spawning unnecessary processes; users may not use all panes

## Risks / Trade-offs

- Risk: More tmux sessions to manage per ticket
  - Mitigation: Sessions are killed when ticket is deleted (existing behavior, extended to all panes)

- Risk: Migration for existing tickets
  - Mitigation: Existing tickets automatically get just the "claude" pane (backward compatible)

## Migration Plan

- Add nullable `panes` column to `projects` table
- Default to empty array `[]` if null (meaning just the "claude" pane)
- No data migration needed; existing sessions continue to work

## Open Questions

- None currently; clarified scope with user

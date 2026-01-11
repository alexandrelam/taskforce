## Context

This feature integrates with Claude Code's hook system to automatically track when Claude is working on a ticket. The system needs to:

1. Identify the ticket based on the working directory (worktree path)
2. Update ticket status when Claude sessions start and stop
3. Provide clear documentation for users to set up their hooks

## Goals / Non-Goals

**Goals:**

- Automatic ticket status updates without manual intervention
- Use worktree path to identify tickets (already stored in database)
- Lightweight API that hooks can call via curl
- Clear user documentation for hook configuration

**Non-Goals:**

- Real-time WebSocket notifications to frontend (can poll or refresh)
- Tracking which tools Claude used (only session start/stop)
- Historical activity log (only track last activity time)

## Decisions

### Decision 1: Worktree-based Ticket Identification

**What:** Tickets are identified by matching the `worktreePath` column against the `cwd` from hook input.

**Why:** The worktree path is already stored when tickets are created. This avoids introducing new configuration or environment variables.

**Alternatives considered:**

- Environment variable (`TICKET_ID`) - requires manual setup per session
- Ticket title parsing from prompt - fragile and error-prone

### Decision 2: Dedicated Tracking Endpoints

**What:** Two new endpoints instead of extending existing PATCH endpoint:

- `POST /api/tickets/track/start` - moves to "In Progress"
- `POST /api/tickets/track/stop` - moves to "To Do"

**Why:**

- Clear semantic meaning for hooks (start/stop)
- Simpler hook scripts (no need to specify column name)
- Can add additional tracking logic (e.g., `lastActivityAt`) without changing interface

**Alternatives considered:**

- Use existing `PATCH /api/tickets/:id` - requires hooks to know ticket ID and column names
- Single `/track` endpoint with action parameter - more complex hook scripts

### Decision 3: Session Start/Stop Events

**What:** Use `SessionStart` hook to mark "In Progress" and `Stop` hook to return to "To Do".

**Why:**

- `SessionStart` fires when Claude begins working in a directory
- `Stop` fires when Claude finishes responding (complete unit of work)
- Returning to "To Do" allows user to review and manually move to "Done"

**Alternatives considered:**

- `UserPromptSubmit` - fires per prompt, too granular
- Move to "Done" on stop - user may want to review or continue work

### Decision 4: User Documentation in HOOKS.md

**What:** Create `HOOKS.md` in repo root with copy-paste hook configurations.

**Why:**

- Easy to find (repo root)
- Markdown renders nicely on GitHub
- Contains both local and project-level hook examples

## Risks / Trade-offs

1. **Race conditions** - Multiple Claude sessions in same worktree could conflict
   - Mitigation: Accept last-write-wins; low probability scenario

2. **Stale "In Progress"** - If Claude crashes, ticket stays "In Progress"
   - Mitigation: `lastActivityAt` allows manual cleanup; future work could auto-reset

3. **Hook setup friction** - Users must manually configure hooks
   - Mitigation: Clear documentation with copy-paste examples

## Open Questions

None - design is straightforward given the constraints.

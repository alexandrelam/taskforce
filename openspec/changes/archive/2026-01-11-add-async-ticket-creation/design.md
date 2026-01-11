## Context

Ticket creation currently blocks the API for up to 5 minutes while running post-worktree commands like `npm install`. The UI is unusable during this time with no progress feedback.

**Constraints:**

- Single backend server (no job queue infrastructure)
- SQLite database (no native pub/sub)
- Frontend already polls tickets every 2 seconds

## Goals / Non-Goals

**Goals:**

- Non-blocking ticket creation (UI remains responsive)
- Progress visibility during setup (which step, logs)
- Clear error reporting when setup fails
- Minimal infrastructure changes (no Redis, no job queues)

**Non-Goals:**

- Real-time WebSocket updates for progress (polling is sufficient)
- Retry failed setups (user can delete and recreate)
- Parallel ticket creation limits (trust the user)

## Decisions

### Decision: Use in-process async execution

Run worktree creation and post-command in a detached Promise after responding to the API request. Store progress in the database.

**Alternatives considered:**

1. **Job queue (Bull, BullMQ)** - Requires Redis, overengineered for this use case
2. **Child process worker** - Adds complexity, harder to coordinate state
3. **WebSocket streaming** - Already have polling; adds client complexity

**Rationale:** The existing 2-second polling already provides near-real-time updates. Storing status in DB and polling is simple, works with SQLite, and requires minimal code changes.

### Decision: Store logs incrementally in database

Append command output to a `setupLogs` text column as it becomes available.

**Alternatives considered:**

1. **Separate logs table** - Over-normalized for this use case
2. **File-based logs** - Harder to serve, cleanup issues

**Rationale:** Single column is simple, logs are small (<100KB), and already have database polling.

### Decision: Status field with enum-like values

Use string column with defined values: `pending`, `creating_worktree`, `running_post_command`, `ready`, `failed`.

**Rationale:** Simple to query, easy to extend, human-readable.

## Architecture

```
Frontend                  Backend                    Database
   |                         |                          |
   |-- POST /api/tickets --> |                          |
   |                         |-- INSERT (pending) ----> |
   |<-- 201 {pending} -------|                          |
   |                         |                          |
   |   (user free to         |-- [async] createWorktree |
   |    navigate UI)         |-- UPDATE (creating_...) ->|
   |                         |-- [async] runPostCmd     |
   |                         |-- UPDATE (running_...) -->|
   |                         |-- UPDATE (ready/failed) ->|
   |                         |                          |
   |-- GET /api/tickets ---> | (polling)                |
   |<-- [{status: ready}] ---|<-------------------------|
```

## Risks / Trade-offs

| Risk                               | Mitigation                                                      |
| ---------------------------------- | --------------------------------------------------------------- |
| Process crash during setup         | Ticket remains in `pending`/intermediate state; user can delete |
| Log column grows large             | Truncate logs if > 50KB                                         |
| Multiple concurrent ticket creates | Acceptable; worktrees are isolated                              |

## Migration Plan

1. Add new columns with defaults (`setupStatus: 'ready'` for existing tickets)
2. Deploy backend changes
3. Deploy frontend changes
4. No breaking API changes (new fields are additive)

## Open Questions

None - straightforward implementation path.

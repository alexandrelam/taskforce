## Context

The application has a Kanban board with terminal integration. Terminals currently spawn in the user's home directory. Users want terminals to open in a configurable project directory.

## Goals / Non-Goals

- Goals:
  - Store project path in SQLite
  - Provide a settings dialog to configure the path
  - Terminals open in the configured directory
  - Simple key-value settings pattern for future extensibility

- Non-Goals:
  - Multiple project profiles
  - Per-task directory configuration
  - Complex settings categories (keep minimal for now)

## Decisions

- **Settings storage**: Key-value table in SQLite (`settings` table with `key` and `value` columns). This is simple and extensible.
  - Alternatives considered: JSON file, environment variables. SQLite chosen for consistency with existing database approach.

- **API design**: REST endpoints `GET /api/settings/:key` and `PUT /api/settings/:key` for simple CRUD operations.
  - Alternatives considered: GraphQL, single settings object endpoint. REST chosen for simplicity.

- **PTY directory passing**: Pass `cwd` as query parameter in WebSocket URL (`/pty?cwd=/path`).
  - Alternatives considered: Initial JSON message. Query param chosen for simplicity.

- **Settings dialog**: Use shadcn/ui components (Dialog, Sidebar pattern). Start with single "Terminal" settings page.
  - Alternatives considered: Separate settings page. Dialog chosen per user reference design.

## Risks / Trade-offs

- **Path validation**: User may enter invalid path. Mitigation: Frontend validates path exists before saving.
- **Security**: PTY accepts any cwd. Mitigation: Backend validates path exists before using.

## Migration Plan

1. Add settings table schema
2. Run `npm run db:push` to sync schema
3. No data migration needed (new table)

## Open Questions

None - straightforward implementation.

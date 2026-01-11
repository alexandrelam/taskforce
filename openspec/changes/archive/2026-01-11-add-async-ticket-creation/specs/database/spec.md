## MODIFIED Requirements

### Requirement: Tickets Table

The system SHALL define a tickets table in `src/db/schema.ts` for storing Kanban board tickets.

#### Scenario: Tickets table definition

- **WHEN** a developer inspects the database schema
- **THEN** the `tickets` table is defined with:
  - `id` (text, primary key, UUID)
  - `title` (text, not null)
  - `column` (text, not null, default "To Do")
  - `createdAt` (integer, not null, Unix timestamp)
  - `projectId` (text, nullable, foreign key to projects.id)
  - `worktreePath` (text, nullable)
  - `lastActivityAt` (integer, nullable, Unix timestamp of last Claude activity)
  - `isMain` (integer, nullable, boolean flag for main branch tickets)
  - `setupStatus` (text, not null, default "ready", one of: "pending", "creating_worktree", "running_post_command", "ready", "failed")
  - `setupError` (text, nullable, error message when setupStatus is "failed")
  - `setupLogs` (text, nullable, accumulated output from setup commands)

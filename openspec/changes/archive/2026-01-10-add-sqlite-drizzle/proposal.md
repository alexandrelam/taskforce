# Change: Add SQLite Database with Drizzle ORM

## Why

The backend currently has no persistence layer. Adding SQLite with Drizzle ORM provides a lightweight, file-based database with type-safe queries and zero external dependencies.

## What Changes

- Add `drizzle-orm` and `better-sqlite3` dependencies to backend
- Create database configuration with auto-push (no migrations)
- Add `drizzle.config.ts` for Drizzle Kit tooling
- Create initial schema file structure
- Add `db:push` npm script for schema synchronization

## Impact

- Affected specs: New `database` capability
- Affected code: `src/db/` (new), `package.json`, `drizzle.config.ts`

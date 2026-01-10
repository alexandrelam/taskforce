## ADDED Requirements

### Requirement: Settings Table

The system SHALL define a settings table in `src/db/schema.ts` for storing application configuration.

#### Scenario: Settings table definition

- **WHEN** a developer inspects the database schema
- **THEN** the `settings` table is defined with:
  - `key` (text, primary key)
  - `value` (text, not null)

## 1. Dependencies

- [x] 1.1 Install `drizzle-orm` and `better-sqlite3`
- [x] 1.2 Install `drizzle-kit` and `@types/better-sqlite3` as dev dependencies

## 2. Database Setup

- [x] 2.1 Create `src/db/index.ts` with database client initialization
- [x] 2.2 Create `src/db/schema.ts` for table definitions (empty placeholder)
- [x] 2.3 Create `drizzle.config.ts` for Drizzle Kit configuration

## 3. Scripts

- [x] 3.1 Add `db:push` script to `package.json` for auto-push
- [x] 3.2 Add `db:studio` script for Drizzle Studio (optional debugging)

## 4. Validation

- [x] 4.1 Add `data/` to `.gitignore` for SQLite database file
- [x] 4.2 Verify `npm run db:push` works without errors
- [x] 4.3 Verify database client imports correctly in `src/index.ts`

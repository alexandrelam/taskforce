## 1. Database Schema

- [x] 1.1 Add `settings` table to `src/db/schema.ts` with `key` and `value` columns
- [x] 1.2 Run `npm run db:push` to sync schema

## 2. Backend API

- [x] 2.1 Add `GET /api/settings/:key` endpoint in `src/index.ts`
- [x] 2.2 Add `PUT /api/settings/:key` endpoint in `src/index.ts`
- [x] 2.3 Modify `src/pty.ts` to read `cwd` from WebSocket URL query parameter
- [x] 2.4 Validate `cwd` exists before using, fallback to home directory

## 3. Frontend Components

- [x] 3.1 Install required shadcn components: `dialog`, `button`, `input`, `label`, `sidebar`, `breadcrumb`
- [x] 3.2 Create `SettingsDialog.tsx` with sidebar navigation pattern
- [x] 3.3 Implement Terminal settings page with project path input
- [x] 3.4 Add settings button to `TaskBoard.tsx`

## 4. Terminal Integration

- [x] 4.1 Update `Terminal.tsx` to fetch project path from settings API on mount
- [x] 4.2 Pass project path as `cwd` query parameter in WebSocket URL

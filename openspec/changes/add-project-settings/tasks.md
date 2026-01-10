## 1. Database Schema

- [ ] 1.1 Add `settings` table to `src/db/schema.ts` with `key` and `value` columns
- [ ] 1.2 Run `npm run db:push` to sync schema

## 2. Backend API

- [ ] 2.1 Add `GET /api/settings/:key` endpoint in `src/index.ts`
- [ ] 2.2 Add `PUT /api/settings/:key` endpoint in `src/index.ts`
- [ ] 2.3 Modify `src/pty.ts` to read `cwd` from WebSocket URL query parameter
- [ ] 2.4 Validate `cwd` exists before using, fallback to home directory

## 3. Frontend Components

- [ ] 3.1 Install required shadcn components: `dialog`, `button`, `input`, `label`, `sidebar`, `breadcrumb`
- [ ] 3.2 Create `SettingsDialog.tsx` with sidebar navigation pattern
- [ ] 3.3 Implement Terminal settings page with project path input
- [ ] 3.4 Add settings button to `TaskBoard.tsx`

## 4. Terminal Integration

- [ ] 4.1 Update `Terminal.tsx` to fetch project path from settings API on mount
- [ ] 4.2 Pass project path as `cwd` query parameter in WebSocket URL

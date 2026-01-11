## 1. Database Schema

- [x] 1.1 Add `statusOverride` boolean column to tickets table in `src/db/schema.ts`
- [x] 1.2 Run `npm run db:push` to sync schema

## 2. Backend API

- [x] 2.1 Update `PATCH /api/tickets/:id` to set `statusOverride: true` when column changes
- [x] 2.2 Update `POST /api/tickets/track/start` to skip tickets with `statusOverride: true`
- [x] 2.3 Update `POST /api/tickets/track/stop` to skip tickets with `statusOverride: true`
- [x] 2.4 Add `PATCH /api/tickets/:id/clear-override` endpoint to reset `statusOverride` to false
- [x] 2.5 Update `GET /api/tickets` to return `statusOverride` field

## 3. Frontend UI

- [x] 3.1 Update Task interface to include `statusOverride` field
- [x] 3.2 Add visual indicator (badge/icon) on tickets with override enabled
- [x] 3.3 Add "Clear override" button or context action to allow automatic tracking again
- [x] 3.4 Show tooltip explaining override status when hovering

## 4. Testing

- [ ] 4.1 Manually test: drag ticket, verify override is set
- [ ] 4.2 Manually test: call track/start API, verify overridden tickets are not moved
- [ ] 4.3 Manually test: clear override, verify automatic tracking resumes

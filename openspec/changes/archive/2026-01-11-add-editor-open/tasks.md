## 1. Database & API

- [x] 1.1 Add `editor` column to projects table in schema.ts
- [x] 1.2 Run `npm run db:push` to sync schema
- [x] 1.3 Update `GET /api/projects` to include editor field
- [x] 1.4 Update `POST /api/projects` to accept editor field
- [x] 1.5 Update `PATCH /api/projects/:id` to accept editor field
- [x] 1.6 Add `POST /api/tickets/:id/open-editor` endpoint that launches the configured editor

## 2. Frontend Settings

- [x] 2.1 Add editor dropdown to project card in SettingsDialog.tsx
- [x] 2.2 Update Project interface to include editor field
- [x] 2.3 Save editor preference when changed

## 3. Kanban Board UI

- [x] 3.1 Add "Open in Editor" button to ticket cards (visible on hover or always visible)
- [x] 3.2 Call `POST /api/tickets/:id/open-editor` when button is clicked
- [x] 3.3 Show appropriate feedback (toast) on success/failure
- [x] 3.4 Disable button when ticket setup is not ready

## 4. Validation

- [ ] 4.1 Test creating project with editor selection
- [ ] 4.2 Test editing project editor preference
- [ ] 4.3 Test opening editor from regular ticket
- [ ] 4.4 Test opening editor from main ticket (uses project path)
- [ ] 4.5 Test with each supported editor (vscode, cursor, neovim, intellij)

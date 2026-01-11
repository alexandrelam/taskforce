## 1. Database Schema

- [x] 1.1 Add `projects` table with `id`, `name`, `path`, `createdAt` columns
- [x] 1.2 Add `projectId` foreign key to `tickets` table (nullable for migration)
- [x] 1.3 Run `npm run db:push` to synchronize schema

## 2. Backend API

- [x] 2.1 Add `GET /api/projects` endpoint to list all projects
- [x] 2.2 Add `POST /api/projects` endpoint to create a project
- [x] 2.3 Add `DELETE /api/projects/:id` endpoint with cascade ticket deletion
- [x] 2.4 Add `GET /api/settings/selected_project` to retrieve selected project
- [x] 2.5 Update `POST /api/tickets` to accept `projectId` parameter
- [x] 2.6 Update `GET /api/tickets` to filter by `projectId` query param
- [x] 2.7 Remove old `project_path` setting handling (deprecated)

## 3. Frontend - Settings Dialog

- [x] 3.1 Add "Projects" navigation item in settings sidebar
- [x] 3.2 Create projects list view showing name and path
- [x] 3.3 Add form to create new project (name + path inputs)
- [x] 3.4 Add delete button for each project with confirmation
- [x] 3.5 Remove old "Project Path" input from Terminal section

## 4. Frontend - Project Selector

- [x] 4.1 Add project dropdown/selector in TaskBoard header
- [x] 4.2 Fetch projects list and populate selector
- [x] 4.3 Store selected project in SQLite via settings API
- [x] 4.4 Filter kanban board to show only tickets for selected project
- [x] 4.5 Pass selected project's path to terminal when opening tickets
- [x] 4.6 Create ticket with current project's ID

## 5. Validation

- [x] 5.1 Test project creation flow
- [x] 5.2 Test ticket creation scoped to project
- [x] 5.3 Test project switching updates board correctly
- [x] 5.4 Test project deletion cascades to tickets
- [x] 5.5 Test terminal opens in project directory

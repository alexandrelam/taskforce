## 1. Backend Implementation

- [x] 1.1 Add `GET /api/projects/:id/commit` endpoint to retrieve last commit info
- [x] 1.2 Add `POST /api/projects/:id/pull` endpoint to execute git pull

## 2. Frontend Implementation

- [x] 2.1 Add state for commit info and pull loading in TaskBoard
- [x] 2.2 Fetch commit info when selected project changes
- [x] 2.3 Add Pull button with loading spinner next to project selector
- [x] 2.4 Display last commit hash and message near project selector
- [x] 2.5 Implement pull button click handler with toast notifications

## 3. Validation

- [x] 3.1 Test pull functionality with a real git repository
- [x] 3.2 Verify loading state appears during pull
- [x] 3.3 Verify commit info updates after successful pull

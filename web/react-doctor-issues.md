# React Doctor Issues

Scan command:

```bash
npx -y react-doctor@latest . --verbose
```

Summary:

- [ ] Overall score: `94 / 100` (`Great`)
- [ ] `77 warnings` across `25/58 files`
- [ ] Full diagnostics available at `/tmp/react-doctor-ce44c076-7165-48d4-8992-e9f8ea6f3c9a`

## State Management

- [ ] Refactor `src/components/SettingsDialog.tsx:45` to reduce `useState` count and consider `useReducer` for related state.
- [ ] Refactor `src/components/task-board/ProjectBoard.tsx:56` to reduce `useState` count and consider `useReducer` for related state.
- [ ] Refactor `src/components/task-board/ProjectBoard.tsx:331` to reduce `useState` count and consider `useReducer` for related state.
- [ ] Refactor `src/components/task-board/dialogs/OpenBranchDialog.tsx:21` to reduce `useState` count and consider `useReducer` for related state.
- [ ] Refactor `src/components/task-board/dialogs/CreateTicketDialog.tsx:32` to reduce `useState` count and consider `useReducer` for related state.
- [ ] Refactor `src/components/settings/CreateProjectForm.tsx:11` to reduce `useState` count and consider `useReducer` for related state.

## Effects Used As Event Handlers

- [ ] Move `useEffect` event-like logic in `src/components/SettingsDialog.tsx:58` into the actual event handler.
- [ ] Move `useEffect` event-like logic in `src/components/task-board/dialogs/EditTicketDialog.tsx:20` into the actual event handler.

## Accessibility

- [ ] Remove `autoFocus` from `src/components/task-board/dialogs/EditTicketDialog.tsx:63`.
- [ ] Remove `autoFocus` from `src/components/task-board/ProjectBoard.tsx:105`.
- [ ] Remove `autoFocus` from `src/components/task-board/ProjectBoard.tsx:205`.
- [ ] Remove `autoFocus` from `src/components/task-board/dialogs/OpenBranchDialog.tsx:61`.
- [ ] Remove `autoFocus` from `src/components/task-board/dialogs/CreateTicketDialog.tsx:87`.

## Correctness

- [ ] Replace array index key usage in `src/components/ui/ripple.tsx:35` with a stable identifier.

## Component Size

- [ ] Break up the `Kanban` component in `src/components/ui/kanban.tsx:199` (389 lines) into smaller focused components.

## Dead Code

- [ ] Review and remove or reintegrate unused file `src/App.css`.
- [ ] Review and remove committed build artifact `dist/assets/index-DY-AZVTd.js` if it should not live in source control.
- [ ] Review and remove committed build artifact `dist/assets/index-DnSuF4MO.css` if it should not live in source control.
- [ ] Review and remove or reintegrate unused file `src/hooks/useTickets.ts`.
- [ ] Review and remove or reintegrate unused file `src/components/ui/neon-gradient-card.tsx`.
- [ ] Review and remove or reintegrate unused file `src/components/ui/resizable.tsx`.

## Unused Exports And Types

- [ ] Review unused export warnings affecting `src/components/ui/dialog.tsx`.
- [ ] Review unused export warnings affecting `src/components/ui/sidebar.tsx`.
- [ ] Review unused export warnings affecting `src/components/ui/breadcrumb.tsx`.
- [ ] Review unused export warnings affecting `src/lib/api.ts`.
- [ ] Review unused export warnings affecting `src/components/task-board/index.ts`.
- [ ] Review unused export warnings affecting `src/lib/compose-refs.ts`.
- [ ] Review unused export warnings affecting `src/components/ui/select.tsx`.
- [ ] Review unused export warnings affecting `src/components/ui/kanban.tsx`.
- [ ] Review unused export warnings affecting `src/components/ui/dropdown-menu.tsx`.
- [ ] Review unused export warnings affecting `src/components/task-board/TaskBoardHeader.tsx`.
- [ ] Review unused export warnings affecting `src/components/ui/alert-dialog.tsx`.
- [ ] Review unused export warnings affecting `src/components/ui/sheet.tsx`.
- [ ] Review unused type `KanbanProps` in `src/components/ui/kanban.tsx`.

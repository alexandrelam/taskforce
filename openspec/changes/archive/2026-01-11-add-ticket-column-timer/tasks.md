## 1. Implementation

- [x] 1.1 Add `columnEnteredAt` state tracking in `TaskBoard.tsx` to store when each ticket entered its current column (in-memory only, initialized on page load)
- [x] 1.2 Update `handleColumnsChange` to reset `columnEnteredAt` when a ticket moves to a different column
- [x] 1.3 Create a `formatElapsedTime` utility function that converts milliseconds to "Xm" or "Xh Ym" format
- [x] 1.4 Add a `useEffect` with `setInterval` to update the displayed elapsed time every minute
- [x] 1.5 Display the elapsed time on each `KanbanItem` card with muted styling

## 2. Validation

- [ ] 2.1 Manual test: verify timer displays on all ticket cards
- [ ] 2.2 Manual test: verify timer resets when dragging a ticket between columns
- [ ] 2.3 Manual test: verify timer format switches from "Xm" to "Xh Ym" at 60 minutes
- [ ] 2.4 Manual test: verify timer resets on page refresh

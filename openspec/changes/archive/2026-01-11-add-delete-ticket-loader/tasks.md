## 1. Implementation

- [x] 1.1 Add `deletingTicketId` state to track which ticket is being deleted
- [x] 1.2 Update `handleDeleteTicket` to set loading state before API call and clear it in finally block
- [x] 1.3 Add spinner icon to delete button when `deletingTicketId` matches the ticket ID
- [x] 1.4 Disable delete button when `deletingTicketId` matches the ticket ID
- [x] 1.5 Manual verification: test delete button shows loader and is disabled during deletion

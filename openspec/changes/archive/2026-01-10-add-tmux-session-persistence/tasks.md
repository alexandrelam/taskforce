## 1. Backend Implementation

- [x] 1.1 Add tmux detection function that checks for tmux binary at startup
- [x] 1.2 Add tmux availability flag exported from pty module
- [x] 1.3 Modify WebSocket handler to parse `sessionId` query parameter
- [x] 1.4 Implement tmux session spawn/attach logic (`tmux new-session -A -s <id>`)
- [x] 1.5 Handle tmux process I/O bridging to WebSocket

## 2. Frontend Implementation

- [x] 2.1 Update Terminal component to include ticket ID as sessionId in WebSocket URL
- [x] 2.2 Add tmux availability check endpoint or include in health check

## 3. API Updates

- [x] 3.1 Add `/api/tmux/status` endpoint to report tmux availability to frontend

## 4. Validation

- [ ] 4.1 Manual test: Start session, reload page, verify reconnection
- [ ] 4.2 Manual test: Start session, restart server, verify reconnection
- [ ] 4.3 Manual test: Verify fallback behavior when tmux not available

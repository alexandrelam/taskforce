## 1. Implementation

- [x] 1.1 Export `sanitizeSessionId` function from `pty.ts`
- [x] 1.2 Add `killTmuxSession(sessionId: string)` function in `pty.ts`
- [x] 1.3 Call `killTmuxSession` in the ticket delete endpoint (`src/index.ts`)

## 2. Validation

- [x] 2.1 Test creating a ticket, opening terminal, then deleting ticket
- [x] 2.2 Verify tmux session is cleaned up after deletion (run `tmux list-sessions`)

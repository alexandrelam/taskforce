# Change: Add Kanban Board with Terminal Cards

## Why

Provide a visual task management interface where each card opens an interactive terminal session, enabling task execution directly from the board.

## What Changes

- Add `@diceui/kanban` component via shadcn
- Add `xterm.js` for terminal emulation in frontend
- Add WebSocket PTY server in Express backend using `node-pty`
- Create Kanban board view as main UI
- Wire cards to open terminal instances on click (connected to real shell)

## Impact

- Affected specs: `kanban-board` (new)
- Affected code: `web/src/` (new components), `src/` (PTY WebSocket server)
- New dependencies:
  - Frontend: `@diceui/kanban`, `xterm`, `@xterm/addon-fit`
  - Backend: `node-pty`, `ws`

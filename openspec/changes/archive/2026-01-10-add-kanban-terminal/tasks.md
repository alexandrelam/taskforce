## 1. Setup

- [x] 1.1 Install `@diceui/kanban` via shadcn (`cd web && npx shadcn@latest add @diceui/kanban`)
- [x] 1.2 Install frontend xterm dependencies (`cd web && npm install @xterm/xterm @xterm/addon-fit`)
- [x] 1.3 Install backend PTY dependencies (`npm install node-pty ws @types/ws`)

## 2. Backend PTY Server

- [x] 2.1 Create WebSocket server for PTY connections
- [x] 2.2 Spawn shell processes with node-pty on connection
- [x] 2.3 Pipe data between WebSocket and PTY

## 3. Kanban Board

- [x] 3.1 Create Kanban board component with sample columns (e.g., "To Do", "In Progress", "Done")
- [x] 3.2 Add sample cards for demonstration
- [x] 3.3 Integrate board into App.tsx as main view

## 4. Terminal Integration

- [x] 4.1 Create Terminal component wrapping xterm.js
- [x] 4.2 Connect Terminal to backend WebSocket PTY
- [x] 4.3 Wire card click to open terminal in modal/panel
- [x] 4.4 Style terminal to fit within card detail view

## 5. Validation

- [x] 5.1 Verify frontend build passes (`cd web && npm run build`)
- [x] 5.2 Verify backend build passes (`npm run build`)
- [ ] 5.3 Manual test: drag cards, open terminals, run commands

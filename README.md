<p align="center">
  <img src="web/public/taskforce-logo.png" alt="Taskforce" height="60">
</p>

<p align="center">
  <a href="https://github.com/alexandrelam/10x-claude/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D24-brightgreen" alt="Node">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</p>

<p align="center">
  A Kanban board for managing AI-assisted development workflows.<br>
  Each ticket gets its own git worktree and integrated terminal, letting you work on multiple tasks in parallel with Claude Code.
</p>

## Features

- **Kanban Board** - Drag-and-drop task management (To Do, In Progress, Done)
- **Git Worktrees** - Auto-creates isolated branches for each ticket
- **Integrated Terminal** - Web-based terminal with tmux support
- **Claude Code Integration** - Auto-tracks ticket progress via hooks
- **Multi-project Support** - Manage multiple repositories

<img width="1438" height="898" alt="image" src="https://github.com/user-attachments/assets/d4f3770a-54e4-43d4-9b86-615a46d5b11c" />
<img width="891" height="585" alt="image" src="https://github.com/user-attachments/assets/186cbd81-63b6-47cd-9fc7-d8740c01f5ed" />
<img width="636" height="394" alt="image" src="https://github.com/user-attachments/assets/1e61ef3c-5dca-4ebe-ad45-d1a121228cdd" />

## Prerequisites

- Node.js 24+
- Git
- tmux (optional, for persistent terminal sessions)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/alexandrelam/10x-claude.git
cd 10x-claude

# Install dependencies
npm install
cd web && npm install && cd ..

# Initialize database
npm run db:push

# Start backend (terminal 1)
npm run dev

# Start frontend (terminal 2)
cd web && npm run dev
```

Open http://localhost:3326 and create your first project in Settings.

## Claude Code Integration

Add these hooks to your Claude Code config to auto-track ticket progress:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "TaskStart",
        "hooks": [
          "curl -X POST http://localhost:3325/api/tickets/track/start -H 'Content-Type: application/json' -d '{\"cwd\": \"$CWD\"}'"
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "TaskStop",
        "hooks": [
          "curl -X POST http://localhost:3325/api/tickets/track/stop -H 'Content-Type: application/json' -d '{\"cwd\": \"$CWD\"}'"
        ]
      }
    ]
  }
}
```

## Tech Stack

- **Backend**: Express 5, SQLite, Drizzle ORM, node-pty
- **Frontend**: React 19, Vite, Tailwind CSS 4, shadcn/ui

## License

AGPL-3.0

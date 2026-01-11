# Taskforce

A Kanban board for managing AI-assisted development workflows. Each ticket gets its own git worktree and integrated terminal, letting you work on multiple tasks in parallel with Claude Code.

## Features

- **Kanban Board** - Drag-and-drop task management (To Do, In Progress, Done)
- **Git Worktrees** - Auto-creates isolated branches for each ticket
- **Integrated Terminal** - Web-based terminal with tmux support
- **Claude Code Integration** - Auto-tracks ticket progress via hooks
- **Multi-project Support** - Manage multiple repositories

## Prerequisites

- Node.js 18+
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

Open http://localhost:5173 and create your first project in Settings.

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

ISC

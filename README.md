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
- tmux (recommended - used for persistent terminal sessions and async post-worktree commands)

## Development

```bash
git clone https://github.com/alexandrelam/10x-claude.git
cd 10x-claude

npm install
cd web && npm install && cd ..

npm run db:push

# Terminal 1
npm run dev

# Terminal 2
cd web && npm run dev
```

Open http://localhost:3326 and create your first project in Settings.

The frontend development server proxies `/api`, `/pty`, and `/health` to the backend on port `3325`, so the browser-facing app still uses same-origin paths.

## Production / Single-Server Run

The production app is a single Node server that serves both the API and the built frontend from one URL.

```bash
npm install
cd web && npm install && cd ..
npm run db:push
npm run build
npm start
```

Open http://localhost:3325.

### Runtime Notes

- `PORT` defaults to `3325`
- `DATABASE_PATH` defaults to `data/sqlite.db`
- `data/` should be persisted if you want the SQLite database to survive restarts
- terminal/worktree features still depend on host tools such as `git`, a shell, and optionally `tmux`

## Docker

Docker is supported as a packaging and deployment option without changing the app architecture.

```bash
docker compose up --build
```

Then open http://localhost:3325.

The provided compose file persists SQLite data in a named Docker volume. If you need worktree and terminal operations against host repositories, mount the relevant host directories and ensure the container has access to the required tools and permissions.

## Claude Code Integration

Add these hooks to your Claude Code config (`.claude/settings.json`) to auto-track ticket progress:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:3325/api/tickets/track/start -H 'Content-Type: application/json' -d \"{\\\"cwd\\\": \\\"$PWD\\\"}\" > /dev/null 2>&1 &"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:3325/api/tickets/track/start -H 'Content-Type: application/json' -d \"{\\\"cwd\\\": \\\"$PWD\\\"}\" > /dev/null 2>&1 &"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:3325/api/tickets/track/start -H 'Content-Type: application/json' -d \"{\\\"cwd\\\": \\\"$PWD\\\"}\" > /dev/null 2>&1 &"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:3325/api/tickets/track/stop -H 'Content-Type: application/json' -d \"{\\\"cwd\\\": \\\"$PWD\\\"}\" > /dev/null 2>&1 &"
          }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:3325/api/tickets/track/stop -H 'Content-Type: application/json' -d \"{\\\"cwd\\\": \\\"$PWD\\\"}\" > /dev/null 2>&1 &"
          }
        ]
      }
    ]
  }
}
```

See [HOOKS.md](HOOKS.md) for detailed configuration options and troubleshooting.

If the app is not running on `http://localhost:3325`, replace that origin in the hook commands with your deployed app URL.

## Tech Stack

- **Backend**: Express 5, SQLite, Drizzle ORM, node-pty
- **Frontend**: React 19, Vite, Tailwind CSS 4, shadcn/ui

## License

AGPL-3.0

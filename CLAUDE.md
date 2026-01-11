# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend**: TypeScript + Express 5 (in `/`)
- **Frontend**: Vite + React 19 + Tailwind CSS 4 (in `/web`)
- **Database**: SQLite + Drizzle ORM
- **UI Components**: shadcn/ui (new-york style) - always use shadcn components for UI

## Commands

### Backend (root directory)

```bash
npm run dev      # Start dev server with hot reload (tsx watch)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled output
npm run db:push  # Sync Drizzle schema to SQLite
npm run db:studio # Open Drizzle Studio (visual DB explorer)
```

### Frontend (web directory)

```bash
cd web
npm run dev      # Start Vite dev server
npm run build    # Type-check and build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Adding shadcn components

```bash
cd web
npx shadcn@latest add <component-name>
```

## Architecture

This is a monorepo with two separate npm projects:

- Root (`/`): Express backend API server with WebSocket PTY support
- Web (`/web`): React frontend SPA with Kanban board and terminal

Path alias `@/*` maps to `./src/*` in the frontend.

### Backend Structure

- `src/index.ts` - Express server (port 3325), health check at `/health`
- `src/pty.ts` - WebSocket server at `/pty` for terminal sessions (uses node-pty)
- `src/db/schema.ts` - Drizzle schema definitions
- `src/db/index.ts` - Database client (SQLite at `data/sqlite.db`)

### Frontend Structure

- `src/components/TaskBoard.tsx` - Main Kanban board with terminal panel
- `src/components/Terminal.tsx` - xterm.js wrapper connecting to `/pty` WebSocket
- `src/components/ui/kanban.tsx` - Drag-and-drop Kanban using @dnd-kit

### Communication Flow

1. Kanban board displays tasks in columns (To Do, In Progress, Done)
2. Clicking a task opens the terminal panel
3. Terminal connects via WebSocket to backend PTY
4. Backend spawns shell process (zsh on Mac/Linux, powershell on Windows)

<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

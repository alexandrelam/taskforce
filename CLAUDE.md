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
npm test         # Run backend and frontend test suites
npm run test:backend # Run backend Vitest suite
npm run db:push  # Sync Drizzle schema to SQLite
npm run db:studio # Open Drizzle Studio (visual DB explorer)
```

### Frontend (web directory)

```bash
cd web
npm run dev      # Start Vite dev server
npm run build    # Type-check and build for production
npm run test     # Run frontend Vitest suite
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

### Communication Flow

1. Kanban board displays tasks in columns (To Do, In Progress, Done)
2. Clicking a task opens the terminal panel
3. Terminal connects via WebSocket to backend PTY
4. Backend spawns shell process (zsh on Mac/Linux, powershell on Windows)

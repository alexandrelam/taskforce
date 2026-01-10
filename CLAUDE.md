# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend**: TypeScript + Express 5 (in `/`)
- **Frontend**: Vite + React 19 + Tailwind CSS 4 (in `/web`)
- **UI Components**: shadcn/ui (new-york style) - always use shadcn components for UI

## Commands

### Backend (root directory)
```bash
npm run dev      # Start dev server with hot reload (tsx watch)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled output
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
- Root (`/`): Express backend API server
- Web (`/web`): React frontend SPA

Path alias `@/*` maps to `./src/*` in the frontend.

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
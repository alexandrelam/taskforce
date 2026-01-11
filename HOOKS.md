# Claude Code Hooks for Automatic Ticket Tracking

This guide explains how to configure Claude Code hooks to automatically update ticket status when you work on tickets in this tracking system.

## Overview

When properly configured, the hooks will:

1. **SessionStart** - Move ticket to "In Progress" when Claude starts working
2. **Stop** - Move ticket back to "To Do" when Claude finishes (for review)

## Prerequisites

- The tracking system server must be running (`npm run dev`)
- Tickets must be created through the UI (they get assigned a worktree path)
- You must be running Claude Code from within a ticket's worktree directory

## Hook Configuration

Add the following to your Claude Code settings file.

### Option 1: User Settings (applies to all projects)

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:3000/api/tickets/track/start -H 'Content-Type: application/json' -d \"{\\\"cwd\\\": \\\"$PWD\\\"}\" > /dev/null 2>&1 || true"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:3000/api/tickets/track/stop -H 'Content-Type: application/json' -d \"{\\\"cwd\\\": \\\"$PWD\\\"}\" > /dev/null 2>&1 || true"
          }
        ]
      }
    ]
  }
}
```

### Option 2: Project Settings (applies to specific project)

Add to `.claude/settings.json` in your project root:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:3000/api/tickets/track/start -H 'Content-Type: application/json' -d \"{\\\"cwd\\\": \\\"$PWD\\\"}\" > /dev/null 2>&1 || true"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:3000/api/tickets/track/stop -H 'Content-Type: application/json' -d \"{\\\"cwd\\\": \\\"$PWD\\\"}\" > /dev/null 2>&1 || true"
          }
        ]
      }
    ]
  }
}
```

## How It Works

1. When you create a ticket in the UI, the system creates a git worktree directory
2. The worktree path is stored in the database (`worktreePath` column)
3. When Claude starts in that directory, the `SessionStart` hook fires
4. The hook sends the current working directory (`$PWD`) to the tracking API
5. The API matches the path to a ticket and updates its status

## Testing

You can manually test the endpoints:

```bash
# Test start tracking (replace with actual worktree path)
curl -X POST http://localhost:3000/api/tickets/track/start \
  -H "Content-Type: application/json" \
  -d '{"cwd": "/path/to/your/worktree"}'

# Test stop tracking
curl -X POST http://localhost:3000/api/tickets/track/stop \
  -H "Content-Type: application/json" \
  -d '{"cwd": "/path/to/your/worktree"}'
```

### Expected Responses

**Success:**

```json
{ "success": true, "ticketId": "uuid", "title": "Ticket Title" }
```

**No matching ticket:**

```json
{ "success": false, "error": "No ticket found for this directory" }
```

## Troubleshooting

### Hooks not firing

1. Make sure you've reviewed the hooks in Claude Code's `/hooks` menu
2. Verify the settings file is valid JSON
3. Check that you're in the correct directory (ticket's worktree path)

### Server not responding

1. Ensure the server is running: `npm run dev`
2. Check that port 3000 is accessible
3. Look for errors in the server console

### Ticket not updating

1. Verify the ticket has a `worktreePath` set (created through the UI)
2. Check that `$PWD` matches the ticket's `worktreePath` exactly
3. Inspect the server logs for incoming requests

## API Reference

### POST /api/tickets/track/start

Moves a ticket to "In Progress" based on working directory.

**Request:**

```json
{ "cwd": "/path/to/worktree" }
```

**Response (200):**

```json
{ "success": true, "ticketId": "uuid", "title": "Ticket Title" }
```

**Response (404):**

```json
{ "success": false, "error": "No ticket found for this directory" }
```

### POST /api/tickets/track/stop

Moves a ticket to "To Do" based on working directory.

**Request:**

```json
{ "cwd": "/path/to/worktree" }
```

**Response (200):**

```json
{ "success": true, "ticketId": "uuid", "title": "Ticket Title" }
```

**Response (404):**

```json
{ "success": false, "error": "No ticket found for this directory" }
```

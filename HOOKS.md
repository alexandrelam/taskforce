# Claude Code Hooks for Automatic Ticket Tracking

This guide explains how to configure Claude Code hooks to automatically update ticket status when you work on tickets in this tracking system.

## Overview

When properly configured, the hooks will:

1. **PreToolUse** - Move ticket to "In Progress" before Claude uses a tool
2. **SessionStart** - Move ticket to "In Progress" when a session starts
3. **UserPromptSubmit** - Move ticket to "In Progress" when user submits a prompt (Claude starts working)
4. **Stop** - Move ticket back to "To Do" when Claude finishes responding (waiting for user input)
5. **Notification** - Move ticket back to "To Do" when Claude sends a notification

All hooks run in the background with `&` for non-blocking execution.

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

### Option 2: Project Settings (applies to specific project)

Add to `.claude/settings.json` in your project root:

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

## How It Works

1. When you create a ticket in the UI, the system creates a git worktree directory
2. The worktree path is stored in the database (`worktreePath` column)
3. When Claude uses a tool, the `PreToolUse` hook fires → ticket moves to "In Progress"
4. When a session starts, the `SessionStart` hook fires → ticket moves to "In Progress"
5. When you submit a prompt, the `UserPromptSubmit` hook fires → ticket moves to "In Progress"
6. The hook sends the current working directory (`$PWD`) to the tracking API
7. When Claude finishes responding, the `Stop` hook fires → ticket moves back to "To Do"
8. When Claude sends a notification, the `Notification` hook fires → ticket moves back to "To Do"
9. The API matches the path to a ticket and updates its status

## Testing

You can manually test the endpoints:

```bash
# Test start tracking (replace with actual worktree path)
curl -X POST http://localhost:3325/api/tickets/track/start \
  -H "Content-Type: application/json" \
  -d '{"cwd": "/path/to/your/worktree"}'

# Test stop tracking
curl -X POST http://localhost:3325/api/tickets/track/stop \
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
2. Check that port 3325 is accessible
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

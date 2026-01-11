# Proposal: add-worktree-post-command

## Summary

Add a configurable command that runs automatically after a git worktree is created for a new ticket. This allows users to set up their development environment (e.g., `npm i`, `bundle install`) without manual intervention.

## Motivation

When creating a new ticket that spawns a git worktree, the worktree is a fresh checkout without `node_modules` or other dependencies. Users must manually navigate to the worktree and run setup commands. This feature automates that step by allowing a configurable command to run post-worktree-creation.

## Scope

- **Settings UI**: Add a "General" settings section with a "Post-worktree command" input field
- **Settings Storage**: Store the command in the existing key-value settings table
- **Backend**: Execute the command in the worktree directory after successful worktree creation
- **API Response**: Include command execution result in ticket creation response

## Out of Scope

- Per-project post-worktree commands (global setting only for MVP)
- Multiple command support (users can chain with `&&` if needed)
- Command history or logging UI
- Background/async command execution with progress tracking

## Risks

- **Security**: The command is user-configured and runs on the server. Since this is a local dev tool, this is acceptable, but the command output should be captured and returned for visibility.
- **Long-running commands**: `npm i` can take time. The API call will block until complete, which may cause UI delay. Acceptable for MVP since it's a one-time operation.

## Success Criteria

1. User can configure a post-worktree command in settings
2. Command runs automatically after worktree creation
3. Command output/errors are visible in ticket creation response
4. Empty command setting means no command is run (default behavior)

# Tasks: add-worktree-post-command

## Implementation Tasks

- [x] **Add General settings section to Settings Dialog UI**
  - Add "General" nav item to sidebar
  - Create state management for active section
  - Add input field for "Post-worktree command" setting
  - Load/save the setting via existing settings API (`worktree_post_command` key)
  - Validate: Settings dialog shows General section with input field

- [x] **Add post-command execution to worktree creation (backend)**
  - Create `runPostWorktreeCommand(cwd: string, command: string)` function in `src/worktree.ts`
  - Execute command using `execSync` in the worktree directory
  - Capture stdout/stderr and return result
  - Handle command failures gracefully (return error, don't throw)
  - Validate: Function returns `{ output: string | null, error: string | null }`

- [x] **Integrate post-command into ticket creation API**
  - In `POST /api/tickets`, after successful worktree creation:
    - Fetch `worktree_post_command` setting
    - If set and worktree was created, run the command
    - Include `postCommandOutput` and `postCommandError` in response
  - Validate: Creating a ticket with a configured command returns execution output

- [ ] **Display command result in UI (optional enhancement)**
  - Show toast or inline message after ticket creation if command ran
  - Display error if command failed
  - Validate: User sees feedback about post-command execution

## Verification

- Create a project pointing to a Node.js repo
- Set post-worktree command to `npm i`
- Create a new ticket
- Verify `node_modules` exists in the worktree
- Verify API response includes command output

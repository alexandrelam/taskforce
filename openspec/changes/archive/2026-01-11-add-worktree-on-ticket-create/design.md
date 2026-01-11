## Context

Users want isolated workspaces for each ticket to enable parallel development. Git worktrees provide this capability by allowing multiple working directories from a single repository.

## Goals / Non-Goals

- Goals:
  - Automatically create a git worktree when a ticket is created
  - Name worktrees predictably: `<project-name>-<ticket-slug>`
  - Place worktrees in parent directory of project (e.g., `../`)
  - Terminal sessions open in worktree directory
  - Clean up worktrees when tickets are deleted

- Non-Goals:
  - Managing worktree branches (users handle this manually)
  - Handling worktree conflicts or existing directories
  - Supporting non-git projects (graceful no-op)

## Decisions

### Worktree Naming Convention

- Decision: `<project-folder-name>-<ticket-title-slug>`
- Example: Project at `/Users/alex/code/myapp` with ticket "Add dark mode" creates worktree at `/Users/alex/code/myapp-add-dark-mode`
- Rationale: Groups related worktrees together when sorted alphabetically

### Worktree Location

- Decision: Place in parent directory of project (`../` relative to project path)
- Rationale: Keeps worktrees at same level as main project, easy to find in file explorer

### Branch Selection

- Decision: Create worktree from current branch at time of ticket creation
- Rationale: Simple default behavior; users can create feature branches after worktree exists

### Error Handling

- Decision: Show error but still create ticket if worktree fails
- Rationale: Worktree is convenience feature; ticket creation is primary action
- Implementation: Return `worktreeError` field in API response when git command fails

### Slug Generation

- Decision: Convert title to lowercase, replace spaces/special chars with dashes, limit length
- Example: "Add User Authentication!" -> "add-user-authentication"
- Rationale: Valid filesystem names, readable, consistent

## Risks / Trade-offs

- Risk: Worktree path could conflict with existing directory
  - Mitigation: Return error, let user resolve manually
- Risk: Non-git projects will fail worktree creation
  - Mitigation: Check if project is git repo first, skip gracefully
- Risk: Orphaned worktrees if delete fails
  - Mitigation: Log warning, ticket still deleted

## Open Questions

None - requirements clarified with user.

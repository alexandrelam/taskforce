# E2E Test Scenarios

This file captures the end-to-end scenarios worth covering for the Taskforce app at `http://localhost:3326`.

Current automated coverage is minimal: [`e2e/app.spec.ts`](/home/alex/Projects/taskforce/e2e/app.spec.ts) only checks the empty-state board.

## 1. Empty State And Initial Load

### Scenario: app loads with no selected projects

Precondition: no `selected_projects` setting is stored, or the stored project IDs no longer exist.

Steps:

1. Open `/`.
2. Wait for the board area to render.

Expected:

1. The header is visible with the Taskforce logo, project selector, theme toggle, and settings button.
2. The board shows `No projects selected`.
3. The helper text says `Select up to 3 projects from the dropdown above`.

### Scenario: stored project selection is restored on load

Precondition: at least one valid project exists and `selected_projects` contains its ID.

Steps:

1. Open `/`.
2. Wait for projects and tickets to load.

Expected:

1. The corresponding project board is rendered automatically.
2. The project selector label reflects the restored selection.

## 2. Project Selection

### Scenario: select and unselect a project from the dropdown

Precondition: at least one project exists.

Steps:

1. Open the `Select Projects` dropdown.
2. Select a project.
3. Close and reopen the dropdown.
4. Unselect the same project.

Expected:

1. Selecting a project renders its board.
2. The dropdown button label changes from `Select Projects` to the project name.
3. Unselecting removes the board and returns to the empty state.

### Scenario: select multiple projects up to the limit

Precondition: at least four projects exist.

Steps:

1. Open the project dropdown.
2. Select three distinct projects.
3. Attempt to select a fourth project.

Expected:

1. Exactly three boards are shown.
2. The fourth project cannot be selected.
3. The app shows the `Maximum 3 projects can be selected` toast.

## 3. Settings And Project Management

### Scenario: open settings and switch sections

Steps:

1. Click the settings button.
2. Verify the `General` section.
3. Switch to the `Projects` section.

Expected:

1. The settings dialog opens.
2. `General` shows the PR poll interval field.
3. `Projects` shows existing projects and the create-project form.

### Scenario: update the PR polling interval

Steps:

1. Open settings.
2. In `General`, change the PR interval value.
3. Blur the field.
4. Reload the page and reopen settings.

Expected:

1. The new value is persisted.
2. The saved value is rehydrated after reload.
3. Values below `0.5` are clamped to `0.5`.

### Scenario: create a new project

Steps:

1. Open settings.
2. Go to `Projects`.
3. Fill `Project name` and `/path/to/your/project`.
4. Optionally fill the post-worktree command and toggle `Use worktrees`.
5. Submit the form.

Expected:

1. The project appears in `Existing Projects`.
2. The project becomes available in the project selector.
3. A main ticket is created for the new project.

### Scenario: edit project-level settings

Precondition: at least one project exists.

Steps:

1. Open settings and go to `Projects`.
2. Change the post-worktree command.
3. Change the editor.
4. Toggle `Use worktrees`.

Expected:

1. Each change persists after closing and reopening settings.
2. The updated project configuration is reflected in subsequent ticket flows.

### Scenario: manage custom terminal panes

Precondition: at least one project exists.

Steps:

1. Open settings and go to `Projects`.
2. Add a custom pane name.
3. Close settings.
4. Open any ticket terminal panel.
5. Reopen settings and remove the custom pane.

Expected:

1. The custom pane appears as a terminal tab for that project's tickets.
2. Removing the pane removes the corresponding tab.
3. Duplicate pane names are rejected with a visible validation message.

### Scenario: delete a project

Precondition: at least one non-critical test project exists.

Steps:

1. Open settings and go to `Projects`.
2. Delete the project.

Expected:

1. The project disappears from settings and the project selector.
2. Its tickets are removed from the board.
3. Any invalid persisted selection is cleaned up on the next load.

## 4. Board Header Actions

### Scenario: board header shows git commit info

Precondition: the selected project's path is a valid git repository.

Steps:

1. Select the project.
2. Wait for the board header to load.

Expected:

1. The board header shows the project name.
2. The latest short commit hash and commit message are visible.

### Scenario: open board action menu

Precondition: a project board is visible.

Steps:

1. Click the board menu button.

Expected:

1. The menu contains `Pull`, `Add Ticket`, and `Open Branch`.

### Scenario: pull latest changes

Precondition: a selected project exists and `git pull` is allowed in its repo.

Steps:

1. Open the board menu.
2. Click `Pull`.

Expected:

1. The pull action enters a loading state while running.
2. The action completes without breaking the board.
3. Commit info can refresh on subsequent polling or reload.

## 5. Ticket Creation And Management

### Scenario: open the create-ticket dialog

Precondition: a project board is visible.

Steps:

1. Open the board menu.
2. Click `Add Ticket`.

Expected:

1. The dialog shows fields for title, description, PR link, and base branch.
2. The submit button is available only when the title is non-empty.

### Scenario: create a ticket manually

Precondition: a project board is visible.

Steps:

1. Open `Add Ticket`.
2. Fill the title and optional metadata.
3. Submit the form.

Expected:

1. A new ticket appears in `To Do`.
2. If worktrees are enabled, the ticket enters setup states and eventually becomes ready or failed.
3. If worktrees are disabled, the ticket is created directly in the ready state.

### Scenario: create a ticket from PR metadata

Precondition: the backend can resolve GitHub PR info through `gh`.

Steps:

1. Open `Add Ticket`.
2. Paste a valid GitHub PR URL.

Expected:

1. The PR fetch spinner appears while loading.
2. The title is auto-filled from the PR title.
3. The base branch is auto-filled from the PR head ref.

### Scenario: open an existing branch as a ticket

Precondition: a project board is visible.

Steps:

1. Open the board menu.
2. Click `Open Branch`.
3. Fill the branch name and optional description.
4. Submit.

Expected:

1. A ticket is created in `To Do`.
2. If worktrees are enabled, branch checkout/setup begins in the background.
3. If worktrees are disabled, the ticket is immediately ready.

### Scenario: edit a ticket

Precondition: at least one non-main ticket exists.

Steps:

1. Hover the ticket and click the edit icon.
2. Update the description and PR link.
3. Submit.

Expected:

1. The dialog closes successfully.
2. The updated description is shown on the card.
3. The updated PR link is persisted.
4. Invalid PR links without `http://` or `https://` are rejected.

### Scenario: delete a ticket

Precondition: at least one non-main ticket exists.

Steps:

1. Hover the ticket and click the delete icon.
2. Confirm the alert dialog.

Expected:

1. The ticket is removed from the board.
2. Cleanup runs for any associated tmux session or worktree.
3. Main tickets do not expose the delete action.

## 6. Kanban Status Flow

### Scenario: drag a ticket between columns

Precondition: at least one movable ticket exists.

Steps:

1. Drag a non-main ticket from `To Do` to `In Progress`.
2. Drag the same ticket to `Done`.

Expected:

1. The card reorders visually in the new column.
2. The column counts update.
3. The backend persists the new column.
4. The timer resets when the ticket enters a new column.

### Scenario: manual move enables status override

Precondition: at least one ticket exists.

Steps:

1. Drag a ticket to a different column.

Expected:

1. The ticket receives manual status override in the backend.
2. The card shows the lock indicator.

### Scenario: clear the manual status override

Precondition: a ticket already has a manual status override.

Steps:

1. Click the lock icon on the ticket.

Expected:

1. The lock icon disappears.
2. The app shows `Override cleared`.
3. Automatic status tracking is re-enabled.

## 7. Terminal Panel

### Scenario: open and close the terminal panel from a ticket

Precondition: a visible ticket exists.

Steps:

1. Click a ticket card.
2. Close the terminal panel using the close button.

Expected:

1. Clicking the card opens the terminal panel on the right.
2. The panel title reflects the ticket state, such as `Terminal`, `Setting Up`, or `Setup Failed`.
3. Closing the panel removes it from the layout.

### Scenario: terminal defaults to the `claude` pane

Precondition: a ready ticket exists.

Steps:

1. Open the ticket.

Expected:

1. The `claude` tab is selected by default.
2. The terminal session attaches for the selected task.

### Scenario: switch between custom terminal panes

Precondition: the project has at least one custom pane configured.

Steps:

1. Open the ticket terminal panel.
2. Click each pane tab.

Expected:

1. The active tab styling updates.
2. The terminal session switches to the requested pane.

### Scenario: setup session tab appears during post-worktree setup

Precondition: ticket setup reaches `running_post_command` and exposes a setup tmux session.

Steps:

1. Create a ticket that triggers setup.
2. Open the ticket while setup is running.

Expected:

1. A `setup` tab appears next to `claude`.
2. The app auto-selects `setup` when the task is opened in that state.
3. The `setup` tab shows a spinner while setup is in progress.

### Scenario: setup failure is visible in the terminal panel

Precondition: a ticket setup fails.

Steps:

1. Open the failed ticket.

Expected:

1. The panel title becomes `Setup Failed`.
2. The failed setup output is visible.
3. The `setup` tab is styled as an error state when present.

## 8. Ticket Card Integrations

### Scenario: open a PR from the ticket card

Precondition: a ticket has a PR link.

Steps:

1. Click the PR icon on the ticket card.

Expected:

1. The PR opens in a new browser tab/window.
2. The click does not also open the terminal panel.

### Scenario: open the ticket in the configured editor

Precondition: a project editor is configured and a ready ticket exists.

Steps:

1. Hover the ticket card.
2. Click the editor icon.

Expected:

1. The backend attempts to open the editor for the ticket path.
2. Success shows the `Editor opened` toast.
3. Failure shows an error toast with a useful message.

### Scenario: PR review and CI badges render on the ticket

Precondition: a ticket has a PR link and PR status data.

Steps:

1. Select the project and wait for polling.

Expected:

1. The ticket shows the appropriate review badge, such as `Approved` or `Changes requested`.
2. The ticket shows the appropriate CI badge, such as `Checks passing` or `Conflicts`.

## 9. Regression And Edge Cases

### Scenario: clicking outside project dropdown closes it

Steps:

1. Open the project dropdown.
2. Click outside the dropdown.

Expected:

1. The dropdown closes.

### Scenario: clicking outside the terminal panel closes it

Precondition: the terminal panel is open.

Steps:

1. Click outside the panel.

Expected:

1. The panel closes.
2. Terminal sessions for the current selection are torn down.

### Scenario: project selector recovers from deleted projects in saved settings

Precondition: `selected_projects` contains an ID for a deleted project.

Steps:

1. Open the app.

Expected:

1. Invalid project IDs are filtered out.
2. The cleaned selection is written back to settings.

### Scenario: PR suggestions render when available

Precondition: `gh pr list` returns recent open PRs not already linked to tickets.

Steps:

1. Select a project with qualifying PRs.
2. Wait for suggestions to load.
3. Click one of the suggestion chips.

Expected:

1. Suggested PRs appear below the board header.
2. Clicking a suggestion creates a ticket from that PR.
3. The clicked suggestion disappears from the suggestion list.

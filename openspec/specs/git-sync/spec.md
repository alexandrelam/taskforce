# git-sync Specification

## Purpose

TBD - created by archiving change add-git-pull-button. Update Purpose after archive.

## Requirements

### Requirement: Last Commit Display

The system SHALL display the last commit information for the selected project's main branch in the UI header.

#### Scenario: Display last commit when project is selected

- **WHEN** the user selects a project
- **THEN** the UI displays the short commit hash and truncated commit message of the latest commit on the main branch

#### Scenario: Update after pull

- **WHEN** a git pull operation completes successfully
- **THEN** the displayed commit information updates to reflect the new HEAD

### Requirement: Git Pull Button

The system SHALL provide a button to pull the latest changes from the remote main branch for the selected project.

#### Scenario: Pull button in header

- **WHEN** a project is selected
- **THEN** a "Pull" button is visible in the TaskBoard header

#### Scenario: Pull button disabled when no project

- **WHEN** no project is selected
- **THEN** the "Pull" button is disabled or hidden

#### Scenario: Pull operation loading state

- **WHEN** the user clicks the "Pull" button
- **THEN** the button shows a loading indicator (spinner)
- **AND** the button is disabled to prevent duplicate requests
- **AND** the loading state persists until the pull operation completes

#### Scenario: Pull success

- **WHEN** the git pull operation completes successfully
- **THEN** the loading state is removed
- **AND** a success toast notification is shown

#### Scenario: Pull failure

- **WHEN** the git pull operation fails
- **THEN** the loading state is removed
- **AND** an error toast notification is shown with the error message

### Requirement: Git Pull API

The backend SHALL provide an API endpoint to execute `git pull` on the main branch of a project.

#### Scenario: Pull endpoint

- **WHEN** a client sends `POST /api/projects/:id/pull`
- **THEN** the server executes `git pull` in the project's directory
- **AND** returns the operation result

#### Scenario: Pull success response

- **WHEN** the git pull command succeeds
- **THEN** the response contains `{ success: true, output: string }`
- **AND** HTTP status is 200

#### Scenario: Pull failure response

- **WHEN** the git pull command fails
- **THEN** the response contains `{ success: false, error: string }`
- **AND** HTTP status is 500

### Requirement: Git Commit Info API

The backend SHALL provide an API endpoint to retrieve the last commit information for a project.

#### Scenario: Commit info endpoint

- **WHEN** a client sends `GET /api/projects/:id/commit`
- **THEN** the server executes `git log -1 --format="%h %s"` in the project's directory
- **AND** returns the commit hash and message

#### Scenario: Commit info success response

- **WHEN** the git log command succeeds
- **THEN** the response contains `{ hash: string, message: string }`
- **AND** HTTP status is 200

#### Scenario: Commit info failure response

- **WHEN** the git log command fails (e.g., not a git repo)
- **THEN** the response contains `{ error: string }`
- **AND** HTTP status is 500

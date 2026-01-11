# Change: Add Git Pull Button with Last Commit Display

## Why

Users need a way to sync the main branch with the remote repository directly from the UI. Currently, there is no visual indication of the project's git state and no ability to pull changes without using the terminal.

## What Changes

- Add a "Pull" button to the TaskBoard header (next to the project selector)
- Display the last commit message/hash for the selected project
- Show loading state on the button while the pull operation is in progress
- Add backend API endpoint to execute `git pull` on the main branch

## Impact

- Affected specs: git-sync (new capability)
- Affected code:
  - Backend: `src/index.ts` (new endpoint)
  - Frontend: `web/src/components/TaskBoard.tsx` (UI changes)

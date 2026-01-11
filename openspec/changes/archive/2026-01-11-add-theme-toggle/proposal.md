# Change: Add Light/Dark Theme Toggle

## Why

The application currently has CSS variables defined for both light and dark themes in `index.css`, but lacks a UI control to switch between them. Additionally, the terminal component uses a hardcoded dark theme (`#1a1a1a` background) that doesn't adapt when the app theme changes, creating visual inconsistency.

## What Changes

- Add a ThemeProvider using `next-themes` (already installed) to wrap the application
- Create a theme toggle button in the header that allows switching between light and dark modes
- Update the Terminal component to dynamically adapt its theme based on the current app theme
- Update the Sonner toaster to follow the app theme instead of being hardcoded to dark

## Impact

- Affected specs: New `theme` capability
- Affected code:
  - `web/src/main.tsx` - Wrap app with ThemeProvider
  - `web/src/components/TaskBoard.tsx` - Add theme toggle button
  - `web/src/components/Terminal.tsx` - Dynamic terminal theming
  - `web/src/components/ui/sonner.tsx` - Follow system/app theme
  - `web/index.html` - Add script to prevent flash on load

# Task Dashboard - Polished Demo

This repository contains a small Task Management Dashboard demo (vanilla HTML/CSS/JS).

## How to run

1. Open `index.html` in a modern browser (no build step required).
2. Interact with the controls: search, status filter, sorting by column headers, pagination.

Note: This is a static client-side demo; no server required.

## Key UI & Interaction Improvements

- Modern, structured layout: header, main content, and a persistent usage guide sidebar.
- Improved spacing, typography, and a consistent color system for a production-quality look.
- Polished table with hover states, readable density, and subtle transitions.
- Loading skeleton while tasks are fetched and graceful error message on simulated failure.
- Active search and filters summary displayed under the controls.
- Clear empty-state view when no tasks match filters, with an action to reset the view.

## Inline Status Updates

- Each row has an `Advance` action (if applicable) to progress task status in the order `TODO → IN_PROGRESS → DONE`.
- While the update is in flight the row shows a disabled state and prevents duplicate actions.
- On success the task status updates immediately and the row is briefly highlighted.
- On failure an inline error message is shown and the state is reverted.
- Update logic is simulated locally; no backend required. Use the "Simulate load error" checkbox to test load error handling.

## Usage Guide Sidebar

- The right-side guide explains how to search, filter, sort, paginate, and update task statuses inline.
- The guide is persistent (not a modal) and adapts for smaller screens (stacks under main content).

## Design Decisions

- Keep the original baseline behavior intact and extend rather than rewrite the application.
- Use small, focused UI affordances (highlight matches, row-level feedback) to improve clarity.
- Keep state client-side and use simulated delays/errors for testing UX flows.

If you need any additional UI polish or accessibility improvements, I can iterate further.
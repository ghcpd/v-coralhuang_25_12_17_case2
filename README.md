# Task Dashboard — Polished Demo

This is an improved UI polish of the baseline Task Dashboard demo.

## How to run
- Open `index.html` in your browser (double-click or use a local static server).
- No build step required.

## Key UI & Interaction Improvements ✅
- Modern, structured layout with a persistent **Usage Guide** sidebar.
- Improved typography, spacing, color system, and subtle animations for a production-quality feel.
- Loading overlay with spinner and clear error messages when loading fails (use the **Simulate load error** checkbox to test).
- Empty state view when no tasks match filters, with a Reset action.
- Active search highlights matching keywords in task titles.
- Sort indicators on column headers; clear visual hierarchy for controls.
- Table rows are interactive (hover/focus, keyboard accessible) and open a details modal on click.

## Inline Status Updates
- Each row has an **Action** button to advance status:
  - `TODO` → `IN_PROGRESS` → `DONE`.
- While the update is in progress the action is disabled and shows a working state.
- On success the row is immediately updated and briefly highlighted.
- On failure an inline error is shown and the previous state is preserved.
- Updates are simulated locally (no backend required) and have a small chance to fail to allow testing error UI.

## Design Notes
- Minimal, incremental changes; the baseline behavior and data remain client-side and unchanged.
- The usage guide is part of the page (not a modal) and adapts on small screens.

If you'd like, I can:
- Add a few unit tests for the helper functions,
- Or tweak the color system to match a brand palette.

---
Polished by: GitHub Copilot (OSWE VS Code Prime (Preview))

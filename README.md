# Task Dashboard (Baseline Demo) — Improved UI

This repository contains a simple **Task Management Dashboard** implemented with plain HTML, CSS and vanilla JavaScript. It started as a minimal baseline and has been updated to include a polished UI, better feedback, inline status updates, and an in-context usage guide.

## 🔧 How to run the demo

- Open `index.html` in a web browser. **No build tools, no server, no framework** are required.
- The app uses local mock data and runs entirely in the browser.

## ✨ What I improved (high level summary)

1. **UI visual polish & layout**
   - Clear layout: header, controls, main content + a persistent usage guide sidebar
   - Consistent spacing, typography, and color palette (system font stack, subtle shadows)
   - Hover & focus states for rows & controls
   - Responsive layout: collapses to stacked layout on small screens

2. **Loading / Error handling & state feedback**
   - Loading spinner while tasks are fetched
   - Simulated 20% chance of load failure with clear error message and a **Retry** button
   - Active styling on search and filter controls
   - Single action to reset *all* view state (search, filters, sort + pagination)

3. **Inline status updates** (no backend required)
   - ✅ Start / Complete buttons appear inline in the Status column, enforcing `TODO → IN_PROGRESS → DONE`
   - Row-level spinner while updating, prevents duplicate actions
   - Success animation highlights the updated row briefly
   - Failure shows an inline error message and reverts the state

4. **Usability / feedback enhancements**
   - Search keyword highlighting in task titles
   - Empty-state view when no tasks match current filters (with a Reset button)
   - Visual hover and cursor to indicate clickable rows
   - Recent updates are highlighted (2s fade-out animation)

5. **Usage guide sidebar** (persistently visible in the UI)
   - Brief, in-context instructions for searching, filtering, sorting, pagination, inline updates and reset

## 🔍 Key UX behaviors (what I changed)

- **Loading / error handling** — when the app fetches tasks (simulated with a short delay), a loading spinner is shown. If the mock fetch fails, an error panel with a **Retry** button appears.
- **Inline status updates** — clicking **Start** (for `TODO`) or **Complete** (for `IN_PROGRESS`) will show an overlay spinner on that row and update the status with a short success highlight. On failure (15% chance) an inline error message is shown next to the status control.
- **Search** — matches are highlighted in the title.
- **Sort** — clicking column headers toggles `asc → desc → none`. Arrow indicators show sort direction.
- **Reset** — clears filters, search, sort, and pagination (including any transient update states on tasks).

## 💡 Design decisions

- **Minimal, incremental changes** — I kept existing behavior intact and only added features on top of the baseline.
- **No external libraries** — implemented with vanilla JS and CSS for maximum portability.
- **Mock API behavior** — `listTasks()` has a small simulated delay and a small failure probability to demonstrate loading / error states without a backend.
- **Responsiveness & accessibility** — the layout collapses on small screens and all interactive elements are accessible with keyboard and screen readers where appropriate.

## 📁 Files changed/added

- `index.html` — layout & usage guide sidebar, loading / empty / error placeholders
- `app.js` — added `loadTasks()` helper, inline status update flow, sorting indicators, active control styling
- `README.md` — this file

---

If you'd like to expand the demo with real API integration or persistent storage, the next step would be to replace the mock `listTasks()` / `updateTaskStatus()` with real HTTP requests and add server-side validation.


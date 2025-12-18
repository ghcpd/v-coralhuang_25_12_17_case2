# Task Dashboard - Polished Demo

A modern, feature-rich task management dashboard built with plain HTML, CSS, and vanilla JavaScript. This application demonstrates professional frontend craftsmanship with polished UI, rich interactions, and comprehensive user guidance.

## How to Run

1. **No build tools or dependencies required** – this is pure HTML, CSS, and JavaScript.
2. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge).
3. The application loads with a simulated 600ms delay to showcase loading feedback.

Example:
```bash
# Using Python's built-in server (optional, for local development)
python -m http.server 8000
# Then visit: http://localhost:8000
```

Or simply double-click `index.html` to open it directly in your browser.

## Key Features & Improvements

### 1. **Visual Polish & Modern UI**
- **Professional color system** with CSS custom properties for consistency
- **System font stack** (-apple-system, BlinkMacSystemFont, Segoe UI) for native platform feel
- **Improved spacing and typography** with clear visual hierarchy
- **Smooth transitions and animations**:
  - Button hover states with subtle background changes
  - Success highlight animation (1.5s green fade-out)
  - Error highlight animation with pulsing feedback
  - Modal slide-up entrance animation
- **Responsive design** that adapts gracefully to small screens (sidebar stacks below content)
- **Polished table presentation** with hover states, status badges, and status indicators

### 2. **Loading & Error State Management**
- **Loading indicator** displayed while tasks fetch (600ms simulated delay)
- **Spinner animation** with smooth rotation
- **Error state view** with clear messaging and retry button
- **Layout stability** – no jumping or shifting during state changes
- **Graceful fallbacks** for network failures

### 3. **Inline Task Status Updates**
- **Interactive status badges** in the table – click to change status
- **Enforced status flow**: `TODO → IN_PROGRESS → DONE → TODO`
- **Row-level loading indicator** while update is in progress
- **Duplicate action prevention** – status buttons disabled during update
- **Success feedback**:
  - Row briefly highlighted in green (1.5 second animation)
  - Immediate UI update
  - Task's `updatedAt` field refreshed
- **Error handling**:
  - Inline error message displayed below status cell
  - Error auto-dismisses after 4 seconds
  - Original state preserved on failure
  - 10% simulated failure rate for demo purposes

### 4. **Usability Enhancements**

#### Search with Keyword Highlighting
- Type in the search box to filter tasks by title
- **Matching keywords are highlighted** in yellow with bold text
- Real-time filtering as you type

#### Empty State View
- When no tasks match current filters, a friendly empty state appears
- Displays icon, message, and actionable "Clear Filters" button
- Helps users understand why results are empty

#### Interactive Table Rows
- **Hover effect** with subtle background change and pointer cursor
- Rows are clearly clickable
- Click any row to view full task details in modal
- Clicking status badge updates task without opening modal

#### Recently Updated Task Marking
- Successfully updated tasks are briefly highlighted in green
- Animation is non-intrusive and doesn't interfere with sorting/filtering
- Highlight automatically fades after 1.5 seconds

### 5. **Active Filter & Sort Indicators**
- **Sort indicator pill** displays active sort column and direction (asc/desc)
- **Table headers highlight** in blue when actively sorted
- **Clear visual feedback** on which column is sorted
- **Cycle sorting**: click header to toggle asc → desc → none

### 6. **Reset All Filters**
- **Single "Clear All Filters" button** (top right)
- Resets:
  - Search query
  - Status filter
  - Sort state
  - Pagination (back to page 1)
  - Page size (back to 10)
- Also available on empty state view

### 7. **Persistent Usage Guide Sidebar**
- **Always visible** on the right side of the page
- **Six concise sections** explaining:
  1. **Search** – how to find tasks by title with keyword highlighting
  2. **Filter & Sort** – status filter and column sorting
  3. **Pagination** – page size and navigation
  4. **Update Status** – inline status changes with transition flow
  5. **View Details** – modal interaction for full task info
  6. **Reset** – clearing all filters with one click
- **Visual design**: distinct but unobtrusive
  - Subtle background and borders
  - Readable font size and line height
  - Icons and code formatting for clarity
- **Responsive behavior**:
  - On screens ≤768px, sidebar stacks below main content
  - Adapts layout to column layout for mobile

## How to Use the Application

### Search Tasks
1. Enter a task title or partial keyword in the search box
2. Results filter instantly
3. Matching words in titles are highlighted in yellow

### Filter by Status
1. Use the "All Status" dropdown to filter tasks
2. Select: `TODO`, `IN_PROGRESS`, or `DONE`
3. Table updates immediately

### Sort Results
1. Click any column header (`Task ID`, `Title`, `Assignee`, `Status`, `Created At`)
2. First click: sort ascending ↑
3. Second click: sort descending ↓
4. Third click: remove sort
5. Current sort indicator shows at the top

### Update Task Status
1. Click the status badge (colored button) in the table
2. Status transitions: `TODO` → `IN_PROGRESS` → `DONE` → `TODO`
3. A spinner appears while updating
4. On success: row briefly highlights green and updates
5. On failure: inline error message appears, state reverts

### View Full Task Details
1. Click any row (except the status badge)
2. Modal opens with:
   - Task ID
   - Full title
   - Assignee
   - Current status
   - Created and updated timestamps
3. Close with ✕ button or click outside modal

### Navigate Pages
1. Use "Page size" dropdown (5, 10, or 20 tasks per page)
2. Use "← Prev" and "Next →" buttons to navigate
3. Current page and total pages displayed

### Clear Everything
1. Click "Clear All Filters" button (top right)
2. All search, filters, sorting, and pagination reset to defaults

## Technical Architecture

### State Management
- Single centralized `state` object manages:
  - All tasks (`state.all`)
  - Search query (`state.q`)
  - Status filter (`state.status`)
  - Sort key and direction (`state.sortKey`, `state.sortDir`)
  - Pagination (`state.page`, `state.pageSize`)
  - Recently updated task IDs (`state.recentlyUpdated`)
  - Currently updating task ID (`state.updatingTaskId`)

### Rendering Strategy
- **Single `render()` function** re-renders table and UI state
- **Called after every state change** for consistency
- **Efficient HTML generation** with `.map().join()`
- **Event delegation** for row clicks and status updates

### Async Operations
- **Mock API functions** with realistic delays:
  - `listTasks()` – 600ms delay for initial load
  - `updateTaskStatus()` – 400ms delay per update, 10% failure rate
- **Async/await pattern** for clear error handling
- **try/catch blocks** for robust error management

### Animation & Feedback
- **CSS keyframe animations** for smooth effects
- **CSS transitions** for state changes
- **Spinner animation** with `animation: spin 0.8s linear infinite`
- **Highlight success** fades over 1.5 seconds
- **Highlight error** pulses for 2 seconds

### Responsive Design
- **Flexbox layouts** for flexible arrangements
- **CSS media query** for screens ≤768px
- **Sidebar stacks** below content on mobile
- **Reduced padding and sizing** on small screens
- **Touch-friendly button sizes** (36px height minimum)

## Design Decisions

### Color System
- **Blue** (`#2563eb`) – primary actions, focus states, sort indicators
- **Green** (`#10b981`) – success states, DONE status
- **Amber** (`#f59e0b`) – warning, IN_PROGRESS status
- **Red** (`#ef4444`) – errors
- **Grays** – backgrounds, borders, text variants
- All colors chosen for accessibility and professional appearance

### Typography
- **System font stack** for native platform feel and performance
- **Font sizes**: 14px for body, 13px for secondary, 16px for headers
- **Font weights**: 600 for labels, 500 for buttons, 700 for titles
- **Line height**: 1.6 for readability

### Spacing & Layout
- **16px base padding** for consistency
- **12px gaps** between flex items
- **8px/12px for dense controls** in table and modals
- **Full viewport utilization** with min-height calculations

### Sidebar Placement
- **Right sidebar** keeps main content on the left where users focus
- **280px width** provides ample space for instructional text
- **Persistent design** ensures always available without modal friction
- **Visual separation** with left border and subtle background
- **Responsive stacking** accommodates mobile without hiding content

### Status Flow
- **TODO → IN_PROGRESS → DONE → TODO** follows natural workflow
- **Click-to-cycle approach** simple and intuitive
- **Enforced transitions** prevent invalid state combinations

### Error Handling
- **Graceful degradation** – app functions even with simulated failures
- **Inline errors** keep feedback near the cause
- **Auto-dismissing errors** after 4 seconds to avoid clutter
- **Retry mechanism** for initial data load failures

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

Uses modern CSS (flexbox, custom properties) and ES2020+ JavaScript features.

## File Structure

```
├── index.html       # HTML structure, layout, styles
├── app.js          # JavaScript logic, state management, rendering
└── README.md       # This file
```

## Notes

- **No dependencies** – vanilla HTML, CSS, JavaScript only
- **No build tools** – runs directly in browser
- **No backend** – all data is local and in-memory
- **Simulated delays** – realistic UX feedback without actual network calls
- **Demo failure rate** – 10% of status updates fail to showcase error handling

## Future Enhancement Opportunities

If this were a production application, consider:
- Backend API integration with real persistence
- User authentication and multi-user collaboration
- Task filtering by assignee or date range
- Bulk actions (multi-select and batch updates)
- Task priority, labels, and detailed descriptions
- Due dates and reminders
- Real-time updates with WebSockets
- Accessibility audit (WCAG 2.1 AA compliance)
- Keyboard shortcuts (e.g., Cmd+K for search)
- Dark mode theme toggle

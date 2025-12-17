// Enhanced Task Management Dashboard

function pad(n, len) {
  const s = String(n);
  return s.length >= len ? s : "0".repeat(len - s.length) + s;
}

function formatDate(iso) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1, 2);
  const dd = pad(d.getDate(), 2);
  const hh = pad(d.getHours(), 2);
  const mi = pad(d.getMinutes(), 2);
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function seededTasks() {
  const assignees = ["Alice", "Bob", "Carol", "David", "Eve"];
  const base = Date.now() - 1000 * 60 * 60 * 24 * 30;
  const tasks = [];
  for (let i = 1; i <= 57; i++) {
    const status = i % 3 === 0 ? "DONE" : i % 3 === 1 ? "TODO" : "IN_PROGRESS";
    tasks.push({
      id: `T-${pad(i, 4)}`,
      title: `Task ${i} - ${i % 2 === 0 ? "Quarterly" : "Weekly"} report`,
      assignee: assignees[i % assignees.length],
      status,
      createdAt: new Date(base + i * 6 * 3600 * 1000).toISOString()
    });
  }
  return tasks;
}

// Mock API with loading and potential errors
async function listTasks() {
  await new Promise((r) => setTimeout(r, 800)); // Simulate network delay

  // Simulate occasional failures (10% chance)
  if (Math.random() < 0.1) {
    throw new Error("Failed to load tasks. Please try again.");
  }

  return seededTasks();
}

// Mock API for updating task status
async function updateTaskStatus(taskId, newStatus) {
  await new Promise((r) => setTimeout(r, 500)); // Simulate network delay

  // Simulate occasional failures (15% chance)
  if (Math.random() < 0.15) {
    throw new Error("Failed to update task status. Please try again.");
  }

  return { success: true };
}

// Status transition validation
function canTransitionStatus(currentStatus, newStatus) {
  const transitions = {
    TODO: ['IN_PROGRESS'],
    IN_PROGRESS: ['DONE'],
    DONE: []
  };
  return transitions[currentStatus]?.includes(newStatus) || false;
}

// Highlight search matches in text
function highlightText(text, query) {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// State
const state = {
  all: [],
  q: "",
  status: "ALL",
  sortKey: null,
  sortDir: null, // "asc" | "desc" | null
  page: 1,
  pageSize: 10,
  loading: false,
  error: null,
  updatingTasks: new Set(), // Set of task IDs currently being updated
  recentlyUpdated: new Set() // Set of recently updated task IDs
};

// Elements
const elQ = document.getElementById("q");
const elStatus = document.getElementById("status");
const elReset = document.getElementById("reset");
const elSummary = document.getElementById("summary");
const elContent = document.getElementById("content");

const elBackdrop = document.getElementById("backdrop");
const elClose = document.getElementById("close");
const elModalBody = document.getElementById("modalBody");

// Derived
function applyQueryFilterSort() {
  let out = [...state.all];

  const q = state.q.trim().toLowerCase();
  if (q) out = out.filter((t) => t.title.toLowerCase().includes(q));

  if (state.status !== "ALL") out = out.filter((t) => t.status === state.status);

  if (state.sortKey && state.sortDir) {
    const k = state.sortKey;
    const dir = state.sortDir;
    out.sort((a, b) => {
      const va = String(a[k]);
      const vb = String(b[k]);
      const cmp = va.localeCompare(vb);
      return dir === "asc" ? cmp : -cmp;
    });
  }

  return out;
}

function renderLoading() {
  elContent.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      Loading tasks...
    </div>
  `;
}

function renderError() {
  elContent.innerHTML = `
    <div class="error">
      <strong>Error:</strong> ${state.error}
      <br><br>
      <button type="button" class="btn btn-primary" onclick="loadTasks()">Try Again</button>
    </div>
  `;
}

function renderEmpty(filteredTasks) {
  const hasFilters = state.q.trim() || state.status !== "ALL";
  elContent.innerHTML = `
    <div class="empty-state">
      <h3>No tasks found</h3>
      <p>${hasFilters ? 'Try adjusting your search or filters.' : 'No tasks available.'}</p>
      ${hasFilters ? '<button type="button" class="btn btn-primary" onclick="resetFilters()">Reset Filters</button>' : ''}
    </div>
  `;
}

function renderTable(filteredTasks, pageItems) {
  const sortClass = (key) => {
    if (state.sortKey !== key) return '';
    return state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc';
  };

  elContent.innerHTML = `
    <div class="table-wrapper">
      <table aria-label="Task table">
        <thead>
          <tr>
            <th data-key="id" class="${sortClass('id')}">Task ID</th>
            <th data-key="title" class="${sortClass('title')}">Title</th>
            <th data-key="assignee" class="${sortClass('assignee')}">Assignee</th>
            <th data-key="status" class="${sortClass('status')}">Status</th>
            <th data-key="createdAt" class="${sortClass('createdAt')}">Created At</th>
          </tr>
        </thead>
        <tbody id="tbody">
          ${pageItems.map(t => `
            <tr data-id="${t.id}" class="${state.recentlyUpdated.has(t.id) ? 'updated' : ''} ${state.updatingTasks.has(t.id) ? 'updating' : ''}">
              <td>${t.id}</td>
              <td>${highlightText(t.title, state.q)}</td>
              <td>${t.assignee}</td>
              <td>
                <div class="status-cell">
                  <span class="status-indicator status-${t.status.toLowerCase().replace('_', '-')}">${t.status.replace('_', ' ')}</span>
                  <select class="status-select" data-task-id="${t.id}" ${state.updatingTasks.has(t.id) ? 'disabled' : ''}>
                    <option value="TODO" ${t.status === 'TODO' ? 'selected' : ''} ${!canTransitionStatus(t.status, 'TODO') && t.status !== 'TODO' ? 'disabled' : ''}>TODO</option>
                    <option value="IN_PROGRESS" ${t.status === 'IN_PROGRESS' ? 'selected' : ''} ${!canTransitionStatus(t.status, 'IN_PROGRESS') && t.status !== 'IN_PROGRESS' ? 'disabled' : ''}>IN PROGRESS</option>
                    <option value="DONE" ${t.status === 'DONE' ? 'selected' : ''} ${!canTransitionStatus(t.status, 'DONE') && t.status !== 'DONE' ? 'disabled' : ''}>DONE</option>
                  </select>
                  ${state.updatingTasks.has(t.id) ? '<div class="spinner"></div>' : ''}
                </div>
              </td>
              <td>${formatDate(t.createdAt)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <div class="page-controls">
        <span>Page size:</span>
        <select id="pageSize" class="page-size-select" aria-label="Page size">
          <option value="5" ${state.pageSize === 5 ? 'selected' : ''}>5</option>
          <option value="10" ${state.pageSize === 10 ? 'selected' : ''}>10</option>
          <option value="20" ${state.pageSize === 20 ? 'selected' : ''}>20</option>
        </select>
      </div>

      <span class="page-info" id="pageInfo">Page ${state.page} of ${Math.max(1, Math.ceil(filteredTasks.length / state.pageSize))}</span>

      <div class="page-controls">
        <button id="prev" type="button" class="btn btn-secondary" ${state.page <= 1 ? 'disabled' : ''}>Previous</button>
        <button id="next" type="button" class="btn btn-secondary" ${state.page >= Math.ceil(filteredTasks.length / state.pageSize) ? 'disabled' : ''}>Next</button>
      </div>
    </div>
  `;
}

function render() {
  if (state.loading) {
    renderLoading();
    return;
  }

  if (state.error) {
    renderError();
    return;
  }

  const filteredTasks = applyQueryFilterSort();
  const total = filteredTasks.length;

  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > pageCount) state.page = pageCount;

  const start = (state.page - 1) * state.pageSize;
  const pageItems = filteredTasks.slice(start, start + state.pageSize);

  elSummary.textContent = `${total} item${total !== 1 ? 's' : ''}`;

  if (total === 0) {
    renderEmpty(filteredTasks);
  } else {
    renderTable(filteredTasks, pageItems);
  }

  // Re-attach event listeners after re-rendering
  attachTableEventListeners();
}

function attachTableEventListeners() {
  // Status update listeners
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', handleStatusUpdate);
  });

  // Row click listeners (avoid triggering on status select clicks)
  document.querySelectorAll('#tbody tr').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.status-select')) return;
      const id = tr.getAttribute('data-id');
      const task = state.all.find(t => t.id === id);
      if (task) openModal(task);
    });
  });
}

async function handleStatusUpdate(e) {
  const select = e.target;
  const taskId = select.getAttribute('data-task-id');
  const newStatus = select.value;

  const task = state.all.find(t => t.id === taskId);
  if (!task || task.status === newStatus) return;

  if (!canTransitionStatus(task.status, newStatus)) {
    alert(`Cannot change status from ${task.status} to ${newStatus}. Status must progress: TODO → IN_PROGRESS → DONE.`);
    select.value = task.status; // Reset select
    return;
  }

  // Start updating
  state.updatingTasks.add(taskId);
  render();

  try {
    await updateTaskStatus(taskId, newStatus);
    task.status = newStatus;
    state.recentlyUpdated.add(taskId);

    // Remove from recently updated after 2 seconds
    setTimeout(() => {
      state.recentlyUpdated.delete(taskId);
      render();
    }, 2000);

  } catch (error) {
    alert(`Error updating task: ${error.message}`);
    select.value = task.status; // Reset select
  } finally {
    state.updatingTasks.delete(taskId);
    render();
  }
}

function openModal(task) {
  elModalBody.innerHTML = `
    <div class="task-detail">
      <div class="task-detail-label">Task ID</div>
      <div class="task-detail-value">${task.id}</div>
    </div>
    <div class="task-detail">
      <div class="task-detail-label">Title</div>
      <div class="task-detail-value">${task.title}</div>
    </div>
    <div class="task-detail">
      <div class="task-detail-label">Assignee</div>
      <div class="task-detail-value">${task.assignee}</div>
    </div>
    <div class="task-detail">
      <div class="task-detail-label">Status</div>
      <div class="task-detail-value">
        <span class="status-indicator status-${task.status.toLowerCase().replace('_', '-')}">${task.status.replace('_', ' ')}</span>
      </div>
    </div>
    <div class="task-detail">
      <div class="task-detail-label">Created At</div>
      <div class="task-detail-value">${formatDate(task.createdAt)}</div>
    </div>
  `;
  elBackdrop.style.display = "flex";
}

function closeModal() {
  elBackdrop.style.display = "none";
}

// Event handlers
elQ.addEventListener("input", (e) => {
  state.q = e.target.value;
  state.page = 1;
  render();
});

elStatus.addEventListener("change", (e) => {
  state.status = e.target.value;
  state.page = 1;
  render();
});

elReset.addEventListener("click", () => {
  resetFilters();
});

function resetFilters() {
  state.q = "";
  state.status = "ALL";
  state.sortKey = null;
  state.sortDir = null;
  state.page = 1;
  state.pageSize = 10;
  state.recentlyUpdated.clear();

  elQ.value = "";
  elStatus.value = "ALL";
  render();
}

elClose.addEventListener("click", closeModal);
elBackdrop.addEventListener("click", (e) => {
  if (e.target === elBackdrop) closeModal();
});

// Sort by header
document.addEventListener("click", (e) => {
  const th = e.target.closest("th[data-key]");
  if (!th) return;
  const key = th.getAttribute("data-key");
  if (!key) return;

  if (state.sortKey !== key) {
    state.sortKey = key;
    state.sortDir = "asc";
  } else {
    if (state.sortDir === "asc") state.sortDir = "desc";
    else if (state.sortDir === "desc") {
      state.sortKey = null;
      state.sortDir = null;
    } else state.sortDir = "asc";
  }

  state.page = 1;
  render();
});

// Pagination
document.addEventListener("change", (e) => {
  if (e.target.id === "pageSize") {
    state.pageSize = Number(e.target.value);
    state.page = 1;
    render();
  }
});

document.addEventListener("click", (e) => {
  if (e.target.id === "prev") {
    state.page = Math.max(1, state.page - 1);
    render();
  } else if (e.target.id === "next") {
    state.page = state.page + 1;
    render();
  }
});

// Load tasks function
async function loadTasks() {
  state.loading = true;
  state.error = null;
  render();

  try {
    state.all = await listTasks();
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

// Init
(async function init() {
  await loadTasks();
})();

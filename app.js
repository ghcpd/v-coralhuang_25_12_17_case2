// Task Dashboard - Enhanced Version
// Features: Loading/error states, inline status updates, keyword highlighting, animations

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
      createdAt: new Date(base + i * 6 * 3600 * 1000).toISOString(),
      updatedAt: new Date(base + i * 6 * 3600 * 1000).toISOString()
    });
  }
  return tasks;
}

// Mock API with simulated delay
async function listTasks() {
  await new Promise((r) => setTimeout(r, 600));
  return seededTasks();
}

// Mock status update (simulated delay)
async function updateTaskStatus(taskId, newStatus) {
  await new Promise((r) => setTimeout(r, 400));
  // Randomly fail 10% of the time for demo
  if (Math.random() < 0.1) {
    throw new Error("Network error: Failed to update task");
  }
  return { id: taskId, status: newStatus, updatedAt: new Date().toISOString() };
}

// Get next status in flow: TODO -> IN_PROGRESS -> DONE -> (reset to TODO)
function getNextStatus(currentStatus) {
  const flow = { TODO: "IN_PROGRESS", IN_PROGRESS: "DONE", DONE: "TODO" };
  return flow[currentStatus] || "TODO";
}

// State management
const state = {
  all: [],
  q: "",
  status: "ALL",
  sortKey: null,
  sortDir: null,
  page: 1,
  pageSize: 10,
  recentlyUpdated: new Set(), // Track recently updated task IDs
  updatingTaskId: null // Track which task is currently updating
};

// UI Elements
const elQ = document.getElementById("q");
const elStatus = document.getElementById("status");
const elReset = document.getElementById("reset");
const elResetFromEmpty = document.getElementById("resetFromEmpty");
const elTbody = document.getElementById("tbody");
const elSummary = document.getElementById("summary");
const elPageSize = document.getElementById("pageSize");
const elPrev = document.getElementById("prev");
const elNext = document.getElementById("next");
const elPageInfo = document.getElementById("pageInfo");
const elBackdrop = document.getElementById("backdrop");
const elClose = document.getElementById("close");
const elModalBody = document.getElementById("modalBody");
const elLoadingState = document.getElementById("loadingState");
const elErrorState = document.getElementById("errorState");
const elMainContent = document.getElementById("mainContent");
const elRetryBtn = document.getElementById("retryBtn");
const elErrorText = document.getElementById("errorText");
const elEmptyState = document.getElementById("emptyState");
const elTableContainer = document.getElementById("tableContainer");
const elSortIndicator = document.getElementById("sortIndicator");

// Highlight matching keywords in text
function highlightMatch(text, query) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, "<mark style='background:#fef3c7;font-weight:600;'>$1</mark>");
}

// Get status badge HTML
function getStatusBadge(task) {
  const statusClass = `badge-${task.status.toLowerCase().replace("_", "-")}`;
  const nextStatus = getNextStatus(task.status);
  const isUpdating = state.updatingTaskId === task.id;
  
  return `
    <div class="status-cell">
      <span class="status-indicator ${task.status.toLowerCase().replace("_", "-")}"></span>
      <button 
        class="status-dropdown ${isUpdating ? "status-updating" : ""}" 
        data-task-id="${task.id}"
        data-current-status="${task.status}"
        data-next-status="${nextStatus}"
        ${isUpdating ? "disabled" : ""}
        title="Click to change status to ${nextStatus}"
      >
        <span class="badge badge-sm ${statusClass}">${task.status}</span>
        ${isUpdating ? '<span class="spinner" style="width:12px;height:12px;border-width:1.5px;"></span>' : ''}
      </button>
      <div class="inline-error" data-error-for="${task.id}"></div>
    </div>
  `;
}

// Filter and sort logic
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

// Main render function
function render() {
  const full = applyQueryFilterSort();
  const total = full.length;

  // Show/hide views
  if (total === 0) {
    elTableContainer.style.display = "none";
    elEmptyState.style.display = "block";
  } else {
    elTableContainer.style.display = "block";
    elEmptyState.style.display = "none";
  }

  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > pageCount) state.page = pageCount;

  const start = (state.page - 1) * state.pageSize;
  const pageItems = full.slice(start, start + state.pageSize);

  elSummary.textContent = `${total} items`;
  elPageInfo.textContent = `Page ${state.page} / ${pageCount}`;

  elPrev.disabled = state.page <= 1;
  elNext.disabled = state.page >= pageCount;

  // Update sort indicator
  if (state.sortKey && state.sortDir) {
    elSortIndicator.textContent = `Sorted by ${state.sortKey} (${state.sortDir})`;
    elSortIndicator.style.display = "inline-block";
  } else {
    elSortIndicator.style.display = "none";
  }

  const q = state.q.trim().toLowerCase();
  elTbody.innerHTML = pageItems
    .map((t) => {
      const titleDisplay = q ? highlightMatch(t.title, state.q) : t.title;
      const rowClass = state.recentlyUpdated.has(t.id) ? "success" : "";
      
      return `
        <tr data-id="${t.id}" class="${rowClass}">
          <td>${t.id}</td>
          <td>${titleDisplay}</td>
          <td>${t.assignee}</td>
          <td>${getStatusBadge(t)}</td>
          <td>${formatDate(t.createdAt)}</td>
        </tr>
      `;
    })
    .join("");

  // Attach status dropdown listeners
  document.querySelectorAll(".status-dropdown").forEach((btn) => {
    btn.addEventListener("click", handleStatusChange);
  });

  // Attach row click listeners for modal (exclude status cell clicks)
  document.querySelectorAll("tbody tr").forEach((tr) => {
    tr.addEventListener("click", (e) => {
      if (!e.target.closest(".status-cell")) {
        const id = tr.getAttribute("data-id");
        const task = state.all.find((x) => x.id === id);
        if (task) openModal(task);
      }
    });
  });
}

// Handle status change button click
async function handleStatusChange(e) {
  e.stopPropagation();
  
  const btn = e.currentTarget;
  const taskId = btn.getAttribute("data-task-id");
  const currentStatus = btn.getAttribute("data-current-status");
  const nextStatus = btn.getAttribute("data-next-status");

  if (state.updatingTaskId === taskId) return; // Prevent duplicate clicks

  state.updatingTaskId = taskId;
  const task = state.all.find((t) => t.id === taskId);
  if (!task) return;

  render(); // Show loading state

  try {
    await updateTaskStatus(taskId, nextStatus);
    
    // Update task in state
    task.status = nextStatus;
    task.updatedAt = new Date().toISOString();

    // Mark as recently updated for highlight animation
    state.recentlyUpdated.add(taskId);
    setTimeout(() => {
      state.recentlyUpdated.delete(taskId);
      render();
    }, 1500);

    render();
  } catch (err) {
    state.updatingTaskId = null;
    // Show inline error
    const errorEl = document.querySelector(`[data-error-for="${taskId}"]`);
    if (errorEl) {
      errorEl.textContent = err.message;
      errorEl.classList.add("show");
      setTimeout(() => {
        errorEl.classList.remove("show");
        errorEl.textContent = "";
      }, 4000);
    }
    render();
  }

  state.updatingTaskId = null;
}

// Modal functions
function openModal(task) {
  elModalBody.innerHTML = `
    <div class="kv"><div class="k">Task ID</div><div class="v">${task.id}</div></div>
    <div class="kv"><div class="k">Title</div><div class="v">${task.title}</div></div>
    <div class="kv"><div class="k">Assignee</div><div class="v">${task.assignee}</div></div>
    <div class="kv"><div class="k">Status</div><div class="v"><span class="badge badge-${task.status.toLowerCase().replace("_", "-")}">${task.status}</span></div></div>
    <div class="kv"><div class="k">Created At</div><div class="v">${formatDate(task.createdAt)}</div></div>
    <div class="kv"><div class="k">Updated At</div><div class="v">${formatDate(task.updatedAt)}</div></div>
  `;
  elBackdrop.classList.add("visible");
}

function closeModal() {
  elBackdrop.classList.remove("visible");
}

// Show loading state
function showLoading() {
  elLoadingState.style.display = "block";
  elErrorState.style.display = "none";
  elMainContent.style.display = "none";
}

// Show error state
function showError(message) {
  elErrorText.textContent = message;
  elErrorState.style.display = "block";
  elLoadingState.style.display = "none";
  elMainContent.style.display = "none";
}

// Show main content
function showContent() {
  elMainContent.style.display = "block";
  elLoadingState.style.display = "none";
  elErrorState.style.display = "none";
}

// Event Listeners

// Search input
elQ.addEventListener("input", (e) => {
  state.q = e.target.value;
  state.page = 1;
  render();
});

// Status filter
elStatus.addEventListener("change", (e) => {
  state.status = e.target.value;
  state.page = 1;
  render();
});

// Reset button
function resetAllFilters() {
  state.q = "";
  state.status = "ALL";
  state.sortKey = null;
  state.sortDir = null;
  state.page = 1;
  state.pageSize = 10;

  elQ.value = "";
  elStatus.value = "ALL";
  elPageSize.value = "10";

  render();
}

elReset.addEventListener("click", resetAllFilters);
elResetFromEmpty.addEventListener("click", resetAllFilters);

// Page size
elPageSize.addEventListener("change", (e) => {
  state.pageSize = Number(e.target.value);
  state.page = 1;
  render();
});

// Pagination
elPrev.addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  render();
});

elNext.addEventListener("click", () => {
  state.page = state.page + 1;
  render();
});

// Modal close
elClose.addEventListener("click", closeModal);
elBackdrop.addEventListener("click", (e) => {
  if (e.target === elBackdrop) closeModal();
});

// Sort by clicking table headers
document.querySelectorAll("th[data-key]").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.getAttribute("data-key");
    if (!key) return;

    // Update header visual states
    document.querySelectorAll("th[data-key]").forEach((h) => {
      h.classList.remove("active", "asc", "desc");
    });

    if (state.sortKey !== key) {
      state.sortKey = key;
      state.sortDir = "asc";
    } else {
      // Cycle: asc -> desc -> none
      if (state.sortDir === "asc") {
        state.sortDir = "desc";
      } else if (state.sortDir === "desc") {
        state.sortKey = null;
        state.sortDir = null;
      } else {
        state.sortKey = key;
        state.sortDir = "asc";
      }
    }

    if (state.sortKey) {
      th.classList.add("active", state.sortDir);
    }

    state.page = 1;
    render();
  });
});

// Retry button
elRetryBtn.addEventListener("click", init);

// Init
async function init() {
  showLoading();
  try {
    state.all = await listTasks();
    state.q = "";
    state.status = "ALL";
    state.sortKey = null;
    state.sortDir = null;
    state.page = 1;
    showContent();
    render();
  } catch (err) {
    showError(err.message || "Unable to load tasks. Please try again.");
  }
}

// Start app
init();

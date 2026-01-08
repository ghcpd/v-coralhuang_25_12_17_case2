// Baseline demo: improved UI with loading/error handling, inline updates, and usage guide

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

// "Mock API" (delay and simulated failure support)
async function listTasks() {
  await new Promise((r) => setTimeout(r, 450));
  const simulate = document.getElementById("simulateFail") && document.getElementById("simulateFail").checked;
  if (simulate) {
    // Reset the checkbox so errors are explicit per-request
    document.getElementById("simulateFail").checked = false;
    throw new Error("Simulated load failure");
  }
  return seededTasks();
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
  error: null
};

// Elements
const elQ = document.getElementById("q");
const elStatus = document.getElementById("status");
const elReset = document.getElementById("reset");
const elTbody = document.getElementById("tbody");
const elSummary = document.getElementById("summary");
const elPageSize = document.getElementById("pageSize");
const elPrev = document.getElementById("prev");
const elNext = document.getElementById("next");
const elPageInfo = document.getElementById("pageInfo");

const elBackdrop = document.getElementById("backdrop");
const elClose = document.getElementById("close");
const elModalBody = document.getElementById("modalBody");
const elEmpty = document.getElementById("empty");
const elEmptyReset = document.getElementById("emptyReset");
const elActiveFilters = document.getElementById("activeFilters");
const elLoadError = document.getElementById("loadError");

// Helpers
function highlightMatch(text, q) {
  if (!q) return escapeHtml(text);
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc, "ig");
  return escapeHtml(text).replace(re, (m) => `<span class="hl">${m}</span>`);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
}

function advanceStatus(s) {
  if (s === "TODO") return "IN_PROGRESS";
  if (s === "IN_PROGRESS") return "DONE";
  return null;
}

async function simulateUpdate(task, nextStatus) {
  // Simulated network: 85% success
  await new Promise((r) => setTimeout(r, 700));
  if (Math.random() < 0.85) return { ok: true };
  else return { ok: false, error: "Network error" };
}

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
      // For dates, compare timestamps
      if (k === "createdAt") {
        const cmp = new Date(va) - new Date(vb);
        return dir === "asc" ? cmp : -cmp;
      }
      const cmp = va.localeCompare(vb);
      return dir === "asc" ? cmp : -cmp;
    });
  }

  return out;
}

function render() {
  const full = applyQueryFilterSort();
  const total = full.length;

  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > pageCount) state.page = pageCount;

  const start = (state.page - 1) * state.pageSize;
  const pageItems = full.slice(start, start + state.pageSize);

  elSummary.textContent = `${total} items`;
  elPageInfo.textContent = `Page ${state.page} / ${pageCount}`;

  elPrev.disabled = state.page <= 1 || state.loading;
  elNext.disabled = state.page >= pageCount || state.loading;

  // active filters summary
  const parts = [];
  if (state.q) parts.push(`Search: "${state.q}"`);
  if (state.status !== "ALL") parts.push(`Status: ${state.status}`);
  if (state.sortKey && state.sortDir) parts.push(`Sort: ${state.sortKey} ${state.sortDir}`);
  elActiveFilters.textContent = parts.join(" • ");

  // top-level error
  if (state.error) {
    elLoadError.style.display = "block";
    elLoadError.textContent = state.error + " ";
  } else {
    elLoadError.style.display = "none";
  }

  // Loading skeleton
  if (state.loading) {
    elTbody.innerHTML = Array.from({ length: Math.min(7, state.pageSize) })
      .map(() => `
        <tr class="skeleton-row"><td colspan="5">&nbsp;</td></tr>
      `)
      .join("");
    elEmpty.style.display = "none";
    return;
  }

  // Empty state
  if (total === 0) {
    elTbody.innerHTML = "";
    elEmpty.style.display = "block";
    return;
  } else {
    elEmpty.style.display = "none";
  }

  // Render rows
  elTbody.innerHTML = pageItems
    .map((t) => {
      const q = state.q.trim();
      const titleHtml = highlightMatch(t.title, q);
      const isUpdating = !!t.updating;
      const next = advanceStatus(t.status);
      const statusClass = t.status === "TODO" ? "status-todo" : t.status === "IN_PROGRESS" ? "status-inprogress" : "status-done";
      const recent = t.recent ? "recent-updated" : "";

      return `
        <tr class="${recent}" data-id="${t.id}" data-updating="${isUpdating}">
          <td>${t.id}</td>
          <td>${titleHtml}</td>
          <td>${t.assignee}</td>
          <td>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="status-btn ${statusClass}" ${isUpdating ? 'disabled' : ''} data-action="noop">${t.status}</button>
              ${next ? `<button class="status-btn" data-action="advance" data-id="${t.id}" ${isUpdating ? 'disabled' : ''}>Advance →</button>` : ''}
            </div>
            ${t.updateError ? `<div class="muted-xs" style="color:var(--danger);margin-top:6px">${escapeHtml(t.updateError)}</div>` : ''}
          </td>
          <td class="muted-xs">${formatDate(t.createdAt)}</td>
        </tr>
      `;
    })
    .join("");
}

function openModal(task) {
  elModalBody.innerHTML = `
    <div class="kv"><div class="k">Task ID</div><div class="v">${task.id}</div></div>
    <div class="kv"><div class="k">Title</div><div class="v">${task.title}</div></div>
    <div class="kv"><div class="k">Assignee</div><div class="v">${task.assignee}</div></div>
    <div class="kv"><div class="k">Status</div><div class="v">${task.status}</div></div>
    <div class="kv"><div class="k">Created At</div><div class="v">${formatDate(task.createdAt)}</div></div>
  `;
  elBackdrop.style.display = "flex";
}

function closeModal() {
  elBackdrop.style.display = "none";
}

// Events
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
  state.q = "";
  state.status = "ALL";
  state.sortKey = null;
  state.sortDir = null;
  state.page = 1;
  state.pageSize = 10;
  state.error = null;

  elQ.value = "";
  elStatus.value = "ALL";
  elPageSize.value = "10";

  // clear per-task transient state
  state.all.forEach((t) => { delete t.updateError; delete t.recent; delete t.updating; });

  render();
});

document.getElementById("emptyReset").addEventListener("click", () => elReset.click());

elPageSize.addEventListener("change", (e) => {
  state.pageSize = Number(e.target.value);
  state.page = 1;
  render();
});

elPrev.addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  render();
});

elNext.addEventListener("click", () => {
  state.page = state.page + 1;
  render();
});

// Clicks inside tbody: advance button or row open
elTbody.addEventListener("click", async (e) => {
  const adv = e.target.closest("button[data-action=advance]");
  if (adv) {
    const id = adv.getAttribute("data-id");
    const task = state.all.find((x) => x.id === id);
    if (!task || task.updating) return;

    const next = advanceStatus(task.status);
    if (!next) return;

    // start updating
    task.updating = true;
    delete task.updateError;
    render();

    const res = await simulateUpdate(task, next);
    task.updating = false;

    if (res.ok) {
      task.status = next;
      task.recent = true;
      setTimeout(() => { task.recent = false; render(); }, 1700);
    } else {
      task.updateError = res.error || "Update failed";
    }

    render();
    return;
  }

  const tr = e.target.closest("tr");
  if (!tr) return;
  // if click was on a button, don't open modal
  if (e.target.closest("button")) return;

  const id = tr.getAttribute("data-id");
  const task = state.all.find((x) => x.id === id);
  if (task) openModal(task);
});

elClose.addEventListener("click", closeModal);
elBackdrop.addEventListener("click", (e) => {
  if (e.target === elBackdrop) closeModal();
});

// Sort by header
function updateSortIndicators() {
  document.querySelectorAll("th[data-key]").forEach((th) => {
    const key = th.getAttribute("data-key");
    const span = th.querySelector('.sort');
    if (state.sortKey === key && state.sortDir) {
      span.textContent = state.sortDir === 'asc' ? '▲' : '▼';
    } else span.textContent = '';
  });
}

document.querySelectorAll("th[data-key]").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.getAttribute("data-key");
    if (!key) return;

    if (state.sortKey !== key) {
      state.sortKey = key;
      state.sortDir = "asc";
    } else {
      // cycle: asc -> desc -> none
      if (state.sortDir === "asc") state.sortDir = "desc";
      else if (state.sortDir === "desc") {
        state.sortKey = null;
        state.sortDir = null;
      } else state.sortDir = "asc";
    }

    state.page = 1;
    updateSortIndicators();
    render();
  });
});

// Init
async function loadData() {
  state.loading = true;
  state.error = null;
  render();

  try {
    const tasks = await listTasks();
    // attach transient fields
    state.all = tasks.map((t) => ({ ...t }));
  } catch (err) {
    state.error = err && err.message ? err.message : String(err);
  } finally {
    state.loading = false;
    updateSortIndicators();
    render();
  }
}

loadData();


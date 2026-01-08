// Enhanced demo: loading/error states, search highlights, inline status updates, usage hints

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

// "Mock API" (delay + optional simulated error)
async function listTasks({ simulateError } = {}) {
  await new Promise((r) => setTimeout(r, 700));
  if (simulateError) throw new Error("Simulated load error");
  return seededTasks();
}

async function mockUpdateStatus(taskId, newStatus, { failRate = 0.12 } = {}) {
  await new Promise((r) => setTimeout(r, 650));
  if (Math.random() < failRate) throw new Error("Failed to update task status");
  return { ok: true };
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
  updating: new Set(),
  recentlyUpdated: new Map() // id -> timeout id
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

const elOverlay = document.getElementById("overlay");
const elOverlayMsg = document.getElementById("overlayMsg");
const elOverlayRetry = document.getElementById("overlayRetry");
const elSimulateError = document.getElementById("simulateError");
const elEmpty = document.getElementById("empty");
const elResetFromEmpty = document.getElementById("resetFromEmpty");

// Helpers
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function highlightMatch(text, q) {
  if (!q) return text;
  const re = new RegExp(`(${escapeRegex(q)})`, "ig");
  return text.replace(re, `<span class="highlight">$1</span>`);
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
      let va = a[k];
      let vb = b[k];
      if (k === 'createdAt') { va = new Date(va); vb = new Date(vb); }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return out;
}

function render() {
  elSummary.textContent = `${state.all.length} items`;

  // Loading / Error overlay
  if (state.loading) {
    elOverlay.style.display = 'flex';
    elOverlayMsg.textContent = 'Loading tasks…';
    elOverlayRetry.style.display = 'none';
  } else if (state.error) {
    elOverlay.style.display = 'flex';
    elOverlayMsg.textContent = state.error.message || 'Error loading tasks';
    elOverlayRetry.style.display = 'inline-block';
  } else {
    elOverlay.style.display = 'none';
  }

  // Apply query/filter/sort then paginate
  const full = applyQueryFilterSort();
  const total = full.length;

  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > pageCount) state.page = pageCount;

  const start = (state.page - 1) * state.pageSize;
  const pageItems = full.slice(start, start + state.pageSize);

  elPageInfo.textContent = `Page ${state.page} / ${pageCount}`;
  elPrev.disabled = state.page <= 1;
  elNext.disabled = state.page >= pageCount;

  // Empty state
  if (!state.loading && total === 0) {
    elEmpty.style.display = 'flex';
    document.querySelector('table').style.display = 'none';
    return;
  } else {
    elEmpty.style.display = 'none';
    document.querySelector('table').style.display = '';
  }

  // Render rows
  elTbody.innerHTML = pageItems.map((t) => {
    const isUpdating = state.updating.has(t.id);
    const recent = state.recentlyUpdated.has(t.id);
    const actionButton = (() => {
      if (t.status === 'TODO') return `<button class="btn primary" data-action="advance" data-id="${t.id}" ${isUpdating? 'disabled':''}>${isUpdating? 'Working...':'Start'}</button>`;
      if (t.status === 'IN_PROGRESS') return `<button class="btn primary" data-action="advance" data-id="${t.id}" ${isUpdating? 'disabled':''}>${isUpdating? 'Working...':'Complete'}</button>`;
      return `<button class="btn" disabled>—</button>`;
    })();

    const titleHtml = highlightMatch(t.title, state.q.trim());

    return `
      <tr data-id="${t.id}" class="${recent? 'recent':''}" tabindex="0" role="button">
        <td>${t.id}</td>
        <td class="title">${titleHtml}</td>
        <td>${t.assignee}</td>
        <td>${t.status}</td>
        <td>${formatDate(t.createdAt)}</td>
        <td class="actions">
          ${actionButton}
          <div class="row-error" data-error-for="${t.id}"></div>
        </td>
      </tr>
    `;
  }).join('');

  // Update sort indicators in headers
  document.querySelectorAll('th[data-key]').forEach(th => {
    const key = th.getAttribute('data-key');
    const span = th.querySelector('.sort');
    if (state.sortKey === key) {
      span.textContent = state.sortDir === 'asc' ? '▲' : '▼';
    } else span.textContent = '';
  });
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
function closeModal() { elBackdrop.style.display = 'none'; }

// Events
elQ.addEventListener('input', e => { state.q = e.target.value; state.page = 1; render(); });
elStatus.addEventListener('change', e => { state.status = e.target.value; state.page = 1; render(); });
elPageSize.addEventListener('change', e => { state.pageSize = Number(e.target.value); state.page = 1; render(); });
elPrev.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); render(); });
elNext.addEventListener('click', () => { state.page = state.page + 1; render(); });

elReset.addEventListener('click', () => {
  state.q=''; state.status='ALL'; state.sortKey=null; state.sortDir=null; state.page=1; state.pageSize=10; state.error=null;
  elQ.value=''; elStatus.value='ALL'; elPageSize.value='10'; render();
});
elResetFromEmpty.addEventListener('click', () => elReset.click());

elOverlayRetry.addEventListener('click', () => { loadTasks(); });

// Table interactions (row click opens modal, buttons handle inline updates)
elTbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (btn) {
    e.stopPropagation();
    const id = btn.getAttribute('data-id');
    await handleAdvanceAction(id, btn);
    return;
  }
  const tr = e.target.closest('tr');
  if (!tr) return;
  const id = tr.getAttribute('data-id');
  const task = state.all.find(t => t.id === id);
  if (task) openModal(task);
});

// keyboard open
elTbody.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-id');
    const task = state.all.find(t => t.id === id);
    if (task) openModal(task);
  }
});

// Sort headers
document.querySelectorAll('th[data-key]').forEach((th) => {
  th.addEventListener('click', () => {
    const key = th.getAttribute('data-key');
    if (!key) return;
    if (state.sortKey !== key) { state.sortKey = key; state.sortDir = 'asc'; }
    else { if (state.sortDir === 'asc') state.sortDir = 'desc'; else if (state.sortDir === 'desc'){ state.sortKey=null; state.sortDir=null; } else state.sortDir='asc'; }
    state.page = 1; render();
  });
});

// Modal
const elCloseBtn = document.getElementById('close');
elCloseBtn.addEventListener('click', closeModal);
elBackdrop.addEventListener('click', (e) => { if (e.target === elBackdrop) closeModal(); });

// Inline update handling
async function handleAdvanceAction(id, btn) {
  if (state.updating.has(id)) return; // prevent duplicate
  const task = state.all.find(t => t.id === id);
  if (!task) return;

  // Determine next status
  const next = task.status === 'TODO' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'DONE' : null;
  if (!next) return;

  // start updating
  state.updating.add(id); render();
  clearRowError(id);

  try {
    await mockUpdateStatus(id, next);
    // apply immediately
    task.status = next;
    // mark recent
    markRecent(id);
    render();
  } catch (err) {
    showRowError(id, err.message || 'Update failed');
  } finally {
    state.updating.delete(id);
    render();
  }
}

function showRowError(id, msg) {
  const el = document.querySelector(`.row-error[data-error-for="${id}"]`);
  if (el) el.textContent = msg;
}
function clearRowError(id) {
  const el = document.querySelector(`.row-error[data-error-for="${id}"]`);
  if (el) el.textContent = '';
}

function markRecent(id, ttl = 2600) {
  if (state.recentlyUpdated.has(id)) clearTimeout(state.recentlyUpdated.get(id));
  const to = setTimeout(() => { state.recentlyUpdated.delete(id); render(); }, ttl);
  state.recentlyUpdated.set(id, to);
}

// Load tasks with loading / error handling
async function loadTasks() {
  state.loading = true; state.error = null; render();
  try {
    const tasks = await listTasks({ simulateError: elSimulateError.checked });
    state.all = tasks;
    state.loading = false; state.error = null;
    render();
  } catch (err) {
    state.loading = false; state.error = err; render();
  }
}

// Init
loadTasks();


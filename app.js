// Baseline demo: enhanced UI (loading, errors, highlights, inline updates)

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

// "Mock API" (delay + occasional failure to demonstrate error UI)
async function listTasks() {
  // show a realistic delay
  await new Promise((r) => setTimeout(r, 450 + Math.random() * 350));
  // simulate a transient failure ~14% of the time
  if (Math.random() < 0.14) throw new Error("simulated network error");
  return seededTasks();
}

// Simulated update API (advances status, may fail ~18%)
function mockUpdateStatus(taskId, nextStatus) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.18) reject(new Error("update failed"));
      else resolve({ id: taskId, status: nextStatus });
    }, 600 + Math.random() * 800);
  });
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

  // ui state
  loading: false,
  error: null,
  updating: {}, // id -> true
  inlineErrors: {}, // id -> message
  recentlyUpdated: {} // id -> timestamp
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

const elLoading = document.getElementById("loadingBanner");
const elError = document.getElementById("errorBanner");
const elErrorText = document.getElementById("errorText");
const elRetry = document.getElementById("retry");
const elEmpty = document.getElementById("emptyState");
const elEmptyReset = document.getElementById("emptyReset");

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

function highlightMatch(title) {
  const q = state.q.trim();
  if (!q) return escapeHtml(title);
  const idx = title.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return escapeHtml(title);
  const before = escapeHtml(title.slice(0, idx));
  const match = escapeHtml(title.slice(idx, idx + q.length));
  const after = escapeHtml(title.slice(idx + q.length));
  return `${before}<mark style="background:rgba(245,158,11,0.14);padding:0 4px;border-radius:4px;color:inherit">${match}</mark>${after}`;
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])); }

function render() {
  const full = applyQueryFilterSort();
  const total = full.length;

  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > pageCount) state.page = pageCount;

  const start = (state.page - 1) * state.pageSize;
  const pageItems = full.slice(start, start + state.pageSize);

  elSummary.textContent = `${total} item${total !== 1 ? 's' : ''}`;
  elPageInfo.textContent = `Page ${state.page} / ${pageCount}`;

  elPrev.disabled = state.page <= 1;
  elNext.disabled = state.page >= pageCount;

  // table rows with inline actions & highlighting
  elTbody.innerHTML = pageItems
    .map((t) => {
      const updating = !!state.updating[t.id];
      const inlineError = state.inlineErrors[t.id];
      const recent = !!state.recentlyUpdated[t.id];

      const titleHtml = highlightMatch(t.title);

      const statusClass = t.status === 'TODO' ? 'tag todo' : t.status === 'IN_PROGRESS' ? 'tag inprog' : 'tag done';

      const actionBtn = t.status === 'DONE'
        ? `<div class="row-action"><div class="tag done">DONE</div></div>`
        : `<div class="row-action"><button class="icon-btn" data-advance="${t.id}" ${updating? 'disabled':''} title="Advance status">${updating? '<span class="spinner" aria-hidden="true"></span>' : '→'}</button></div>`;

      return `
      <tr data-id="${t.id}" class="${recent? 'updated':''}">
        <td style="white-space:nowrap">${t.id}</td>
        <td>${titleHtml}</td>
        <td>${escapeHtml(t.assignee)}</td>
        <td>
          <div class="status">
            <div class="tag ${statusClass.split(' ')[1]}">${t.status.replace('_',' ')}</div>
            ${actionBtn}
          </div>
          ${inlineError? `<div class="inline-error" role="status">${escapeHtml(inlineError)}</div>` : ''}
        </td>
        <td style="white-space:nowrap">${formatDate(t.createdAt)}</td>
      </tr>`;
    })
    .join("");

  // empty state
  if (total === 0) {
    elEmpty.style.display = '';
    document.querySelector('#tableWrap table').style.display = 'none';
  } else {
    elEmpty.style.display = 'none';
    document.querySelector('#tableWrap table').style.display = '';
  }

  // sorting indicator in headers
  document.querySelectorAll('th[data-key]').forEach((th) => {
    const k = th.getAttribute('data-key');
    const span = th.querySelector('.sort');
    if (!span) return;
    if (state.sortKey === k) span.textContent = state.sortDir === 'asc' ? '↑' : (state.sortDir === 'desc' ? '↓' : '');
    else {
      // default small symbol per column
      if (k === 'title') span.textContent = '🔎';
      else if (k === 'assignee') span.textContent = '👤';
      else if (k === 'createdAt') span.textContent = '🕘';
      else if (k === 'id') span.textContent = '#';
      else span.textContent = '⚑';
    }
  });
}

function openModal(task) {
  elModalBody.innerHTML = `
    <div class="kv"><div class="k">Task ID</div><div class="v">${task.id}</div></div>
    <div class="kv"><div class="k">Title</div><div class="v">${escapeHtml(task.title)}</div></div>
    <div class="kv"><div class="k">Assignee</div><div class="v">${escapeHtml(task.assignee)}</div></div>
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

function resetView() {
  state.q = "";
  state.status = "ALL";
  state.sortKey = null;
  state.sortDir = null;
  state.page = 1;
  state.pageSize = 10;
  state.inlineErrors = {};

  elQ.value = "";
  elStatus.value = "ALL";
  elPageSize.value = "10";
  render();
}

elReset.addEventListener("click", () => resetView());
elEmptyReset.addEventListener('click', resetView);

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

// Click row -> modal (but ignore clicks on action buttons)
elTbody.addEventListener("click", (e) => {
  const advanceBtn = e.target.closest('[data-advance]');
  if (advanceBtn) {
    const id = advanceBtn.getAttribute('data-advance');
    advanceStatus(id);
    return;
  }

  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.getAttribute("data-id");
  const task = state.all.find((x) => x.id === id);
  if (task) openModal(task);
});

elClose.addEventListener("click", closeModal);
elBackdrop.addEventListener("click", (e) => {
  if (e.target === elBackdrop) closeModal();
});

// Sort by header
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
    render();
  });
});

// keyboard shortcuts
window.addEventListener('keydown', (e)=>{
  if (e.key === '/') { e.preventDefault(); elQ.focus(); }
  if (e.key === 'Escape') { if (document.activeElement === elQ) { elQ.value=''; state.q=''; render(); } else closeModal(); }
});

// retry handler
elRetry.addEventListener('click', () => { loadTasks(); });

// advance status inline
async function advanceStatus(id) {
  const task = state.all.find((t) => t.id === id);
  if (!task) return;
  if (state.updating[id]) return; // prevent duplicate

  const order = ['TODO','IN_PROGRESS','DONE'];
  const cur = task.status;
  const idx = order.indexOf(cur);
  if (idx === -1 || idx === order.length - 1) return;
  const next = order[idx+1];

  state.updating[id] = true;
  state.inlineErrors[id] = null;
  render();

  try {
    const res = await mockUpdateStatus(id, next);
    // immediate UI update
    task.status = res.status;
    state.recentlyUpdated[id] = Date.now();
    // remove recent mark after 1.8s
    setTimeout(() => { delete state.recentlyUpdated[id]; render(); }, 1800);
  } catch (err) {
    state.inlineErrors[id] = err.message || 'failed';
  } finally {
    delete state.updating[id];
    render();
  }
}

// Init / load
async function loadTasks() {
  state.loading = true; state.error = null;
  elLoading.style.display = '';
  elError.style.display = 'none';
  try {
    const data = await listTasks();
    state.all = data;
    state.loading = false;
    elLoading.style.display = 'none';
    render();
  } catch (err) {
    state.loading = false;
    state.error = err.message || String(err);
    elLoading.style.display = 'none';
    elError.style.display = '';
    document.getElementById('errorText').firstChild && (document.getElementById('errorText').firstChild.textContent = '');
    // keep existing markup for retry button; set visible message
    document.getElementById('errorText').childNodes[0] && (document.getElementById('errorText').childNodes[0].textContent = ` ${state.error}`);
    render();
  }
}

// initial run
loadTasks();

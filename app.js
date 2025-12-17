// Baseline demo: all operations are local (no loading / error UI, no inline updates)

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

// "Mock API" (delay and occasional failure)
async function listTasks() {
  await new Promise((r) => setTimeout(r, 80));
  // Simulate occasional load failure (20% chance)
  if (Math.random() < 0.2) throw new Error("Failed to fetch tasks. Please try again.");
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
  pageSize: 10
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

function render() {
  // Update header sort indicators
  document
    .querySelectorAll("th[data-key]")
    .forEach((th) => {
      th.classList.remove("sorted", "asc", "desc");
      const key = th.getAttribute("data-key");
      if (state.sortKey === key) {
        th.classList.add("sorted");
        th.classList.add(state.sortDir === "asc" ? "asc" : "desc");
      }
    });

  // Active search / filter styling
  elQ.classList.toggle("active", !!state.q.trim());
  elStatus.classList.toggle("active", state.status !== "ALL");

  const full = applyQueryFilterSort();
  const total = full.length;

  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > pageCount) state.page = pageCount;

  const start = (state.page - 1) * state.pageSize;
  const pageItems = full.slice(start, start + state.pageSize);

  // Update UI controls, sort indicators, and active states
  elSummary.textContent = `${total} items`;
  elPageInfo.textContent = `Page ${state.page} / ${pageCount}`;

  elPrev.disabled = state.page <= 1;
  elNext.disabled = state.page >= pageCount;

  // Show / hide empty state and related controls
  const elEmpty = document.getElementById("empty");
  const elPager = document.querySelector(".pager");
  if (total === 0) {
    elEmpty.style.display = "block";
    elTbody.parentElement.style.display = "none";
    if (elPager) elPager.style.display = "none";
    return;
  } else {
    elEmpty.style.display = "none";
    elTbody.parentElement.style.display = "";
    if (elPager) elPager.style.display = "";
  }

      // Build table rows with inline status controls and highlight
  elTbody.innerHTML = pageItems
    .map((t) => {
      // Highlight title matches
      let titleHtml = t.title;
      const q = state.q.trim().toLowerCase();
      if (q) {
        const re = new RegExp(`(${q.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "ig");
        titleHtml = titleHtml.replace(re, "<span class=\"highlight\">$1</span>");
      }

      // inline status control / display error
      let statusCell = t.status;
      if (t._updating) {
        statusCell = "Updating…";
      } else if (t.status === "TODO") {
        statusCell = `<button class="start" data-id="${t.id}">Start</button>`;
      } else if (t.status === "IN_PROGRESS") {
        statusCell = `<button class="complete" data-id="${t.id}">Complete</button>`;
      } else {
        statusCell = t.status;
      }

      // inline error messaging
      let errorHtml = "";
      if (t._updateError) {
        errorHtml = `<div class="error-inline">${t._updateError}</div>`;
      }

      const updatingClass = t._updating ? "updating" : "";
      const recentClass = t._recent ? "recently-updated" : "";

      return `
        <tr data-id="${t.id}" class="${updatingClass} ${recentClass}">
          <td>${t.id}</td>
          <td>${titleHtml}</td>
          <td>${t.assignee}</td>
          <td>${statusCell}${errorHtml}</td>
          <td>${formatDate(t.createdAt)}</td>
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

elReset.addEventListener("click", () => { // reset all view state
  // Remove any transient states on tasks
  state.all.forEach((t) => delete t._updating);
  state.all.forEach((t) => delete t._updateError);
  state.all.forEach((t) => delete t._recent);
  // Now reset
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
});
// Also support reset from empty message
const elResetEmpty = document.getElementById("resetEmpty");
if (elResetEmpty) {
  elResetEmpty.addEventListener("click", () => elReset.click());
}
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

// Click row -> modal OR inline status buttons
elTbody.addEventListener("click", async (e) => {
  const target = e.target;
  // Inline update buttons
  if (target.matches("button.start") || target.matches("button.complete")) {
    const id = target.getAttribute("data-id");
    const task = state.all.find((x) => x.id === id);
    if (!task) return;
    // Prevent duplicate actions
    if (task._updating) return;

    const newStatus = target.classList.contains("start") ? "IN_PROGRESS" : "DONE";
    await updateTaskStatus(task, newStatus);
    return;
  }

  // Any other cell -> open modal
  const tr = target.closest("tr");
  if (!tr) return;
  const id = tr.getAttribute("data-id");
  const task = state.all.find((x) => x.id === id);
  if (task) openModal(task);
});

// Update status handler (mocked)
async function updateTaskStatus(task, newStatus) {
  task._updating = true;
  render();
  try {
    await new Promise((r) => setTimeout(r, 600));
    // Simulate occasional failure (15%)
    if (Math.random() < 0.15) throw new Error("Failed to update status. Please retry.");
    task.status = newStatus;
    task._recent = true;
    setTimeout(() => {
      delete task._recent;
      render();
    }, 2000);
  } catch (err) {
    task._updateError = err.message || "Error";
    setTimeout(() => {
      delete task._updateError;
      render();
    }, 3000);
  } finally {
    delete task._updating;
    render();
  }
}

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

    // Helper to load tasks with loader/error handling
async function loadTasks() {
  document.getElementById("loader").style.display = "flex";
  document.getElementById("error").style.display = "none";
  try {
    state.all = await listTasks();
    document.getElementById("error").textContent = "";
  } catch (err) {
    document.getElementById("error").innerHTML = `${err.message || "Error"} <button id="retry" type="button">Retry</button>`;
    document.getElementById("error").style.display = "block";
    document.getElementById("loader").style.display = "none";
    // attach retry handler
    const retryBtn = document.getElementById("retry");
    if (retryBtn) {
      retryBtn.onclick = async () => {
        if (await loadTasks()) render();
      };
    }
    return false;
  }
  document.getElementById("loader").style.display = "none";
  return true;
}
// Init
(async function init() {
  if (await loadTasks()) render();
})();


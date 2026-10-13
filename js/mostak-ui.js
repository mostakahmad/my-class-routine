import { getPermissionStatus, requestPermission } from "./notifications.js";
import {
  UNITS,
  addArea,
  addQuick,
  addReminder,
  addTask,
  areaProgress,
  dateKey,
  deleteReminder,
  deleteTask,
  doneCount,
  exportPayload,
  formatClock,
  getNextReminder,
  getState,
  importPayload,
  moveArea,
  remindersOnDay,
  repeatLabel,
  setReminderEnabled,
  sortedAreas,
  todayLog,
  toggleTask,
  updateArea,
  visibleAreas,
} from "./mostak-store.js";

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatWait(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `in ${h}h ${String(m).padStart(2, "0")}m`;
  return `in ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function isEditing() {
  const el = document.activeElement;
  if (!el?.closest) return false;
  return Boolean(el.closest("#m-area-cards, #m-area-editor, #m-add-reminder, #m-add-area"));
}

function renderHero(state, now) {
  const { met, total } = areaProgress(state, now);
  const count = document.getElementById("m-progress-count");
  const label = document.getElementById("m-progress-label");
  const date = document.getElementById("m-today-date");
  if (count) count.textContent = `${met}/${total}`;
  if (label) label.textContent = total ? "Areas on target" : "Add an area to start";
  if (date) {
    date.textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }
  updateMostakCountdown(now, state.reminders);

  const chip = document.getElementById("topbar-chip");
  const chipText = document.getElementById("topbar-status-text");
  if (chip && chipText && document.body.dataset.profile === "mostak") {
    chip.className = "topbar-status";
    chip.classList.add(total && met === total ? "is-class" : "is-live");
    chipText.textContent = total ? `${met}/${total}` : "Today";
  }
}

export function updateMostakCountdown(now = new Date(), reminders) {
  const el = document.getElementById("m-next-countdown");
  if (!el) return;
  const list = reminders || getState(now).reminders;
  const next = getNextReminder(list, now);
  if (!next) {
    el.textContent = "No upcoming reminder";
    return;
  }
  el.textContent = `${next.reminder.title} · ${formatWait(next.at - now)}`;
}

function renderTodayReminders(state, now) {
  const mount = document.getElementById("m-today-reminders");
  if (!mount) return;
  const items = remindersOnDay(state.reminders, now);
  if (!items.length) {
    mount.innerHTML = "";
    return;
  }
  mount.innerHTML = `
    <div class="section-head">
      <h2 class="section-title">Reminders</h2>
    </div>
    <div class="m-reminder-strip">
      ${items
        .map(
          ({ reminder, at }) => `
            <div class="m-reminder-chip">
              <i class="bi bi-bell-fill"></i>
              <span>${escapeHtml(reminder.title)}</span>
              <time>${escapeHtml(formatClock(reminder.time))}</time>
              <span class="m-reminder-when">${escapeHtml(formatWait(Math.max(0, at - now)))}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderAreaCards(state, now) {
  const mount = document.getElementById("m-area-cards");
  if (!mount) return;
  const log = todayLog(state, now);
  const areas = visibleAreas(state);
  if (!areas.length) {
    mount.innerHTML = `
      <div class="surface-card m-empty">
        <p>No active areas. Open Areas to add or unhide one.</p>
      </div>
    `;
    return;
  }

  mount.innerHTML = areas
    .map((area) => {
      const done = doneCount(log, area.id);
      const pct = Math.min(100, Math.round((done / area.target) * 100));
      const quick = Number(log.counts?.[area.id]) || 0;
      const tasks = (log.tasks || []).filter((task) => task.areaId === area.id);
      const met = done >= area.target;
      return `
        <article class="surface-card m-area-card ${met ? "is-met" : ""}">
          <div class="m-area-head">
            <span class="m-area-icon is-${escapeHtml(area.color)}" aria-hidden="true">
              <i class="bi ${escapeHtml(area.icon)}"></i>
            </span>
            <div class="m-area-titles">
              <h3>${escapeHtml(area.name)}</h3>
              <p>${done}/${area.target} ${escapeHtml(area.unit)}</p>
            </div>
            <div class="m-stepper">
              <button type="button" data-action="quick-dec" data-area="${escapeHtml(area.id)}" aria-label="Remove one quick mark" ${quick ? "" : "disabled"}>-</button>
              <span title="Quick marks">${quick}</span>
              <button type="button" data-action="quick-inc" data-area="${escapeHtml(area.id)}" aria-label="Add one quick mark">+</button>
            </div>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${pct}%"></div>
          </div>
          <ul class="m-task-list">
            ${tasks
              .map(
                (task) => `
                  <li class="m-task ${task.done ? "is-done" : ""}">
                    <label>
                      <input type="checkbox" data-action="toggle-task" data-id="${escapeHtml(task.id)}" ${task.done ? "checked" : ""}>
                      <span>${escapeHtml(task.title)}</span>
                    </label>
                    ${task.carriedFrom ? '<em>carried</em>' : ""}
                    <button type="button" data-action="delete-task" data-id="${escapeHtml(task.id)}" aria-label="Delete task">&times;</button>
                  </li>
                `
              )
              .join("")}
          </ul>
          <form class="m-add-task" data-area="${escapeHtml(area.id)}">
            <input class="form-input" name="title" type="text" maxlength="120" placeholder="Add a task" autocomplete="off">
            <button class="btn-add" type="submit">Add</button>
          </form>
        </article>
      `;
    })
    .join("");
}

function renderAreaEditor(state) {
  const mount = document.getElementById("m-area-editor");
  if (!mount) return;
  const areas = sortedAreas(state);
  if (!areas.length) {
    mount.innerHTML = `<div class="surface-card m-empty"><p>Add the first area below.</p></div>`;
    return;
  }
  mount.innerHTML = areas
    .map((area, index) => {
      const unitOptions = UNITS.map(
        (unit) =>
          `<option value="${unit}" ${area.unit === unit ? "selected" : ""}>${unit}</option>`
      ).join("");
      return `
        <article class="surface-card m-editor-card ${area.hidden ? "is-hidden" : ""}">
          <div class="m-editor-top">
            <span class="m-area-icon is-${escapeHtml(area.color)}" aria-hidden="true">
              <i class="bi ${escapeHtml(area.icon)}"></i>
            </span>
            <input class="form-input" data-field="name" data-id="${escapeHtml(area.id)}" value="${escapeHtml(area.name)}" aria-label="Area name" maxlength="60">
          </div>
          <div class="m-editor-row">
            <label class="m-field">
              <span>Daily target</span>
              <input class="form-input" data-field="target" data-id="${escapeHtml(area.id)}" type="number" min="1" max="99" value="${area.target}">
            </label>
            <label class="m-field">
              <span>Unit</span>
              <select class="form-input" data-field="unit" data-id="${escapeHtml(area.id)}">${unitOptions}</select>
            </label>
          </div>
          <div class="m-editor-actions">
            <button type="button" data-action="area-up" data-id="${escapeHtml(area.id)}" aria-label="Move up" ${index === 0 ? "disabled" : ""}><i class="bi bi-arrow-up"></i></button>
            <button type="button" data-action="area-down" data-id="${escapeHtml(area.id)}" aria-label="Move down" ${index === areas.length - 1 ? "disabled" : ""}><i class="bi bi-arrow-down"></i></button>
            <button type="button" class="m-hide" data-action="area-hide" data-id="${escapeHtml(area.id)}">${area.hidden ? "Unhide" : "Hide"}</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderReminderList(state) {
  const mount = document.getElementById("m-reminder-list");
  if (!mount) return;
  if (!state.reminders.length) {
    mount.innerHTML = `<div class="surface-card m-empty"><p>No reminders yet. Add one for anything you need to remember.</p></div>`;
    return;
  }
  mount.innerHTML = state.reminders
    .map(
      (reminder) => `
        <article class="surface-card m-reminder-card ${reminder.enabled ? "" : "is-off"}">
          <div>
            <h3>${escapeHtml(reminder.title)}</h3>
            <p>${escapeHtml(formatClock(reminder.time))} · ${escapeHtml(repeatLabel(reminder))}</p>
          </div>
          <div class="m-reminder-actions">
            <button class="btn-toggle" type="button" data-action="reminder-toggle" data-id="${escapeHtml(reminder.id)}" aria-pressed="${reminder.enabled ? "true" : "false"}" aria-label="Toggle reminder">
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </button>
            <button type="button" class="m-hide" data-action="reminder-delete" data-id="${escapeHtml(reminder.id)}" aria-label="Delete reminder">Delete</button>
          </div>
        </article>
      `
    )
    .join("");
}

async function renderAlertStatus() {
  const note = document.getElementById("m-alert-note");
  const button = document.getElementById("m-enable-alerts");
  if (!note || !button) return;
  const status = await getPermissionStatus();
  if (status === "granted") {
    note.textContent = "Alerts use this device's notification permission.";
    button.hidden = true;
    return;
  }
  button.hidden = false;
  note.textContent =
    status === "denied"
      ? "Notifications are blocked in the browser settings for this site."
      : "Enable alerts to hear special reminders while this app is open.";
}

export function renderMostak(now = new Date(), { force = false } = {}) {
  const state = getState(now);
  renderHero(state, now);
  if (!force && isEditing()) return;
  renderTodayReminders(state, now);
  renderAreaCards(state, now);
  renderAreaEditor(state);
  renderReminderList(state);
  renderAlertStatus();
}

function selectedRepeat() {
  return document.querySelector("#m-repeat button.is-active")?.dataset.repeat || "daily";
}

function selectedDays() {
  return [...document.querySelectorAll("#m-day-picks button[aria-pressed='true']")].map((btn) =>
    Number(btn.dataset.day)
  );
}

function syncReminderFields() {
  const repeat = selectedRepeat();
  const dateWrap = document.getElementById("m-once-wrap");
  const dayWrap = document.getElementById("m-day-picks");
  if (dateWrap) dateWrap.hidden = repeat !== "once";
  if (dayWrap) dayWrap.hidden = repeat !== "days";
}

function showBackupFeedback(message, ok) {
  const el = document.getElementById("m-backup-feedback");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.className = `m-feedback ${ok ? "is-ok" : "is-bad"}`;
}

function saveAreaField(input) {
  if (!input?.dataset?.id || !input.dataset.field) return;
  const patch = {};
  patch[input.dataset.field] = input.dataset.field === "target" ? Number(input.value) : input.value;
  updateArea(input.dataset.id, patch);
}

export function initMostakUI() {
  const cards = document.getElementById("m-area-cards");
  const editor = document.getElementById("m-area-editor");
  const dateInput = document.getElementById("m-reminder-date");
  if (dateInput) dateInput.value = dateKey(new Date());

  cards?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action='quick-inc'], [data-action='quick-dec'], [data-action='delete-task']");
    if (!btn) return;
    if (btn.dataset.action === "quick-inc") addQuick(btn.dataset.area, 1);
    if (btn.dataset.action === "quick-dec") addQuick(btn.dataset.area, -1);
    if (btn.dataset.action === "delete-task") deleteTask(btn.dataset.id);
    renderMostak(new Date(), { force: true });
  });

  cards?.addEventListener("change", (event) => {
    const box = event.target.closest("[data-action='toggle-task']");
    if (!box) return;
    toggleTask(box.dataset.id, box.checked);
    renderMostak(new Date(), { force: true });
  });

  cards?.addEventListener("submit", (event) => {
    const form = event.target.closest(".m-add-task");
    if (!form) return;
    event.preventDefault();
    const title = new FormData(form).get("title");
    addTask(form.dataset.area, title);
    renderMostak(new Date(), { force: true });
  });

  editor?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "area-up") moveArea(btn.dataset.id, -1);
    if (btn.dataset.action === "area-down") moveArea(btn.dataset.id, 1);
    if (btn.dataset.action === "area-hide") {
      const state = getState();
      const area = state.areas.find((item) => item.id === btn.dataset.id);
      if (area) updateArea(area.id, { hidden: !area.hidden });
    }
    renderMostak(new Date(), { force: true });
  });

  editor?.addEventListener("focusout", (event) => {
    const input = event.target.closest("[data-field='name'], [data-field='target']");
    if (!input) return;
    saveAreaField(input);
  });

  editor?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-field='unit'], [data-field='target']");
    if (!input) return;
    saveAreaField(input);
    renderMostak(new Date(), { force: true });
  });

  document.getElementById("m-add-area")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    addArea({ name, target: data.get("target"), unit: data.get("unit") });
    form.reset();
    form.querySelector("[name='target']").value = "1";
    renderMostak(new Date(), { force: true });
  });

  document.getElementById("m-repeat")?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-repeat]");
    if (!btn) return;
    document.querySelectorAll("#m-repeat button").forEach((item) => {
      const active = item === btn;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", active ? "true" : "false");
    });
    syncReminderFields();
  });

  document.getElementById("m-day-picks")?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-day]");
    if (!btn) return;
    const next = btn.getAttribute("aria-pressed") !== "true";
    btn.setAttribute("aria-pressed", next ? "true" : "false");
    btn.classList.toggle("is-active", next);
  });

  document.getElementById("m-add-reminder")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = addReminder({
      title: data.get("title"),
      time: data.get("time"),
      repeat: selectedRepeat(),
      days: selectedDays(),
      date: data.get("date"),
    });
    const feedback = document.getElementById("m-reminder-feedback");
    if (!result.ok) {
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = result.error;
      }
      return;
    }
    if (feedback) feedback.hidden = true;
    form.reset();
    if (dateInput) dateInput.value = dateKey(new Date());
    const time = form.querySelector("[name='time']");
    if (time) time.value = "09:00";
    renderMostak(new Date(), { force: true });
  });

  document.getElementById("m-reminder-list")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "reminder-toggle") {
      setReminderEnabled(btn.dataset.id, btn.getAttribute("aria-pressed") !== "true");
    }
    if (btn.dataset.action === "reminder-delete") deleteReminder(btn.dataset.id);
    renderMostak(new Date(), { force: true });
  });

  document.getElementById("m-export")?.addEventListener("click", () => {
    const blob = new Blob([exportPayload()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mostak-tracker-${dateKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showBackupFeedback("Backup downloaded", true);
  });

  document.getElementById("m-import")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = importPayload(await file.text());
    showBackupFeedback(result.ok ? "Backup restored" : result.error, result.ok);
    if (result.ok) renderMostak(new Date(), { force: true });
  });

  document.getElementById("m-enable-alerts")?.addEventListener("click", async () => {
    await requestPermission();
    await renderAlertStatus();
  });

  syncReminderFields();
}

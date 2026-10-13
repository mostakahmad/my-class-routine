const STORAGE_KEY = "mostak_life_v1";
const LOG_RETENTION_DAYS = 90;
const DUE_WINDOW_MS = 90 * 1000;

export const UNITS = ["applications", "session", "task"];

const COLORS = ["blue", "gold", "purple", "teal", "orange", "green", "rose", "indigo"];
const ICONS = ["bi-bookmark-fill", "bi-flag-fill", "bi-lightning-fill", "bi-star-fill"];

const SEED_AREAS = [
  {
    id: "remote-jobs",
    name: "Remote jobs",
    target: 5,
    unit: "applications",
    icon: "bi-briefcase-fill",
    color: "blue",
    hidden: false,
    order: 0,
  },
  {
    id: "govt-prep",
    name: "Govt job preparation",
    target: 1,
    unit: "session",
    icon: "bi-bank",
    color: "gold",
    hidden: false,
    order: 1,
  },
  {
    id: "programming-school",
    name: "Programming School",
    target: 1,
    unit: "task",
    icon: "bi-code-slash",
    color: "purple",
    hidden: false,
    order: 2,
  },
  {
    id: "sird-tech",
    name: "SIRD Tech",
    target: 1,
    unit: "task",
    icon: "bi-building",
    color: "teal",
    hidden: false,
    order: 3,
  },
  {
    id: "robotics",
    name: "Robotics Plan",
    target: 1,
    unit: "task",
    icon: "bi-cpu",
    color: "orange",
    hidden: false,
    order: 4,
  },
];

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatClock(timeStr) {
  const [hRaw, mRaw] = String(timeStr || "00:00").split(":");
  const h = Number(hRaw) || 0;
  const m = Number(mRaw) || 0;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function emptyState() {
  return {
    version: 1,
    areas: SEED_AREAS.map((area) => ({ ...area })),
    logs: {},
    reminders: [],
  };
}

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.areas) || !Array.isArray(data.reminders)) {
      return null;
    }
    if (!data.logs || typeof data.logs !== "object") data.logs = {};
    return data;
  } catch {
    return null;
  }
}

function write(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode */
  }
  syncMostakRemindersToSW(state.reminders);
  return state;
}

export function peekReminders() {
  return read()?.reminders || [];
}

function pruneLogs(state, now) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - LOG_RETENTION_DAYS);
  const cutoffKey = dateKey(cutoff);
  let removed = false;
  for (const key of Object.keys(state.logs)) {
    if (key < cutoffKey) {
      delete state.logs[key];
      removed = true;
    }
  }
  return removed;
}

function previousLogKey(state, key) {
  const keys = Object.keys(state.logs)
    .filter((item) => item < key)
    .sort();
  return keys.length ? keys[keys.length - 1] : null;
}

function carryOpenTasks(state, key) {
  const log = state.logs[key];
  const prevKey = previousLogKey(state, key);
  if (!prevKey) return;
  const prev = state.logs[prevKey];
  const carried = new Set((log.tasks || []).map((task) => task.carriedFrom).filter(Boolean));
  for (const task of prev?.tasks || []) {
    if (task.done || !task.title || carried.has(task.id)) continue;
    log.tasks.push({
      id: uid(),
      areaId: task.areaId,
      title: task.title,
      done: false,
      carriedFrom: task.id,
    });
  }
}

export function getState(now = new Date()) {
  const existing = read();
  const state = existing || emptyState();
  let dirty = !existing;
  if (pruneLogs(state, now)) dirty = true;

  const key = dateKey(now);
  if (!state.logs[key]) {
    state.logs[key] = { counts: {}, tasks: [], rolled: false };
    dirty = true;
  }
  const log = state.logs[key];
  if (!log.counts) log.counts = {};
  if (!Array.isArray(log.tasks)) log.tasks = [];
  if (!log.rolled) {
    carryOpenTasks(state, key);
    log.rolled = true;
    dirty = true;
  }

  if (dirty) write(state);
  return state;
}

export function todayLog(state, now = new Date()) {
  return state.logs[dateKey(now)] || { counts: {}, tasks: [], rolled: true };
}

export function visibleAreas(state) {
  return [...state.areas].filter((area) => !area.hidden).sort((a, b) => a.order - b.order);
}

export function sortedAreas(state) {
  return [...state.areas].sort((a, b) => a.order - b.order);
}

export function doneCount(log, areaId) {
  const quick = Number(log?.counts?.[areaId]) || 0;
  const named = (log?.tasks || []).filter((task) => task.areaId === areaId && task.done).length;
  return quick + named;
}

export function areaProgress(state, now = new Date()) {
  const log = todayLog(state, now);
  const areas = visibleAreas(state);
  const met = areas.filter((area) => doneCount(log, area.id) >= area.target).length;
  return { met, total: areas.length, log };
}

function clampTarget(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(99, Math.max(1, n));
}

function normalizeUnit(unit) {
  return UNITS.includes(unit) ? unit : "task";
}

export function addQuick(areaId, delta, now = new Date()) {
  const state = getState(now);
  const log = state.logs[dateKey(now)];
  const next = Math.max(0, (Number(log.counts[areaId]) || 0) + delta);
  log.counts[areaId] = next;
  return write(state);
}

export function addTask(areaId, title, now = new Date()) {
  const clean = String(title || "").trim();
  if (!clean) return getState(now);
  const state = getState(now);
  state.logs[dateKey(now)].tasks.push({
    id: uid(),
    areaId,
    title: clean,
    done: false,
  });
  return write(state);
}

export function toggleTask(taskId, done, now = new Date()) {
  const state = getState(now);
  const task = state.logs[dateKey(now)].tasks.find((item) => item.id === taskId);
  if (task) task.done = Boolean(done);
  return write(state);
}

export function deleteTask(taskId, now = new Date()) {
  const state = getState(now);
  const log = state.logs[dateKey(now)];
  log.tasks = log.tasks.filter((task) => task.id !== taskId);
  return write(state);
}

export function addArea({ name, target, unit }) {
  const state = getState();
  const order = state.areas.reduce((max, area) => Math.max(max, area.order), -1) + 1;
  state.areas.push({
    id: uid(),
    name: String(name || "").trim() || "New area",
    target: clampTarget(target),
    unit: normalizeUnit(unit),
    icon: ICONS[order % ICONS.length],
    color: COLORS[order % COLORS.length],
    hidden: false,
    order,
  });
  return write(state);
}

export function updateArea(id, patch) {
  const state = getState();
  const area = state.areas.find((item) => item.id === id);
  if (!area) return state;
  if (typeof patch.name === "string") {
    const name = patch.name.trim();
    if (name) area.name = name;
  }
  if (patch.target != null) area.target = clampTarget(patch.target);
  if (patch.unit) area.unit = normalizeUnit(patch.unit);
  if (typeof patch.hidden === "boolean") area.hidden = patch.hidden;
  return write(state);
}

export function moveArea(id, direction) {
  const state = getState();
  const areas = sortedAreas(state);
  const index = areas.findIndex((area) => area.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= areas.length) return state;
  const [item] = areas.splice(index, 1);
  areas.splice(next, 0, item);
  areas.forEach((area, order) => {
    area.order = order;
  });
  return write(state);
}

function normalizeDays(days) {
  if (!Array.isArray(days)) return [];
  return [...new Set(days.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6))].sort();
}

export function addReminder({ title, time, repeat, days, date }) {
  const clean = String(title || "").trim();
  if (!clean) return { ok: false, error: "Add a reminder title" };
  const mode = repeat === "once" || repeat === "days" ? repeat : "daily";
  const picked = normalizeDays(days);
  if (mode === "days" && !picked.length) return { ok: false, error: "Pick at least one day" };
  if (mode === "once" && !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return { ok: false, error: "Pick a date" };
  }
  const state = getState();
  state.reminders.push({
    id: uid(),
    title: clean,
    time: /^\d{2}:\d{2}$/.test(time) ? time : "09:00",
    repeat: mode,
    days: mode === "days" ? picked : [],
    date: mode === "once" ? date : null,
    enabled: true,
  });
  write(state);
  return { ok: true };
}

export function setReminderEnabled(id, enabled) {
  const state = getState();
  const reminder = state.reminders.find((item) => item.id === id);
  if (reminder) reminder.enabled = Boolean(enabled);
  return write(state);
}

export function deleteReminder(id) {
  const state = getState();
  state.reminders = state.reminders.filter((item) => item.id !== id);
  return write(state);
}

function atTime(date, timeStr) {
  const [hRaw, mRaw] = String(timeStr || "00:00").split(":");
  const at = new Date(date);
  at.setHours(Number(hRaw) || 0, Number(mRaw) || 0, 0, 0);
  return at;
}

export function occursOnDay(reminder, date) {
  if (!reminder || reminder.enabled === false) return false;
  if (reminder.repeat === "once") return reminder.date === dateKey(date);
  if (reminder.repeat === "daily") return true;
  if (reminder.repeat === "days") return normalizeDays(reminder.days).includes(date.getDay());
  return false;
}

export function occurrenceOn(reminder, date) {
  if (!occursOnDay(reminder, date)) return null;
  return atTime(date, reminder.time);
}

export function isDue(reminder, now, windowMs = DUE_WINDOW_MS) {
  const at = occurrenceOn(reminder, now);
  if (!at) return false;
  return now >= at && now.getTime() < at.getTime() + windowMs;
}

export function nextOccurrence(reminder, now = new Date()) {
  if (!reminder || reminder.enabled === false) return null;
  for (let offset = 0; offset < 8; offset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    const at = occurrenceOn(reminder, day);
    if (at && at > now) return at;
  }
  return null;
}

export function getNextReminder(reminders, now = new Date()) {
  let best = null;
  for (const reminder of reminders || []) {
    const at = nextOccurrence(reminder, now);
    if (!at) continue;
    if (!best || at < best.at) best = { reminder, at };
  }
  return best;
}

export function remindersOnDay(reminders, now = new Date()) {
  return (reminders || [])
    .map((reminder) => ({ reminder, at: occurrenceOn(reminder, now) }))
    .filter((item) => item.at && item.at > new Date(now.getTime() - DUE_WINDOW_MS))
    .sort((a, b) => a.at - b.at);
}

export function reminderFireKey(reminder, at) {
  return `mostak_notified_${dateKey(at)}_${reminder.id}`;
}

async function wasNotified(key) {
  try {
    if (localStorage.getItem(key) === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    const cache = await caches.open("notif-keys");
    return Boolean(await cache.match(key));
  } catch {
    return false;
  }
}

async function markNotified(key) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
  try {
    const cache = await caches.open("notif-keys");
    await cache.put(key, new Response("1"));
  } catch {
    /* ignore */
  }
}

export async function checkMostakReminders(now = new Date(), onReminder) {
  const { reminders } = getState(now);
  const fired = [];
  for (const reminder of reminders) {
    if (!isDue(reminder, now)) continue;
    const at = occurrenceOn(reminder, now);
    const key = reminderFireKey(reminder, at);
    if (await wasNotified(key)) continue;
    await markNotified(key);
    const message = {
      title: reminder.title,
      body: `Reminder · ${formatClock(reminder.time)}`,
    };
    fired.push(message);
    if (onReminder) onReminder(message, reminder);
  }
  return fired;
}

export function exportPayload() {
  return JSON.stringify(getState(), null, 2);
}

export function importPayload(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON" };
  }
  if (!data || !Array.isArray(data.areas)) {
    return { ok: false, error: "Backup is missing areas" };
  }

  const areas = data.areas
    .map((area, index) => ({
      id: String(area.id || uid()),
      name: String(area.name || "").trim() || "Area",
      target: clampTarget(area.target),
      unit: normalizeUnit(area.unit),
      icon: typeof area.icon === "string" ? area.icon : ICONS[index % ICONS.length],
      color: COLORS.includes(area.color) ? area.color : COLORS[index % COLORS.length],
      hidden: Boolean(area.hidden),
      order: Number.isFinite(Number(area.order)) ? Number(area.order) : index,
    }))
    .filter((area, index, list) => list.findIndex((item) => item.id === area.id) === index);

  const logs = {};
  if (data.logs && typeof data.logs === "object") {
    for (const [key, log] of Object.entries(data.logs)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !log) continue;
      logs[key] = {
        counts: log.counts && typeof log.counts === "object" ? log.counts : {},
        tasks: Array.isArray(log.tasks)
          ? log.tasks
              .filter((task) => task && task.title)
              .map((task) => ({
                id: String(task.id || uid()),
                areaId: String(task.areaId || ""),
                title: String(task.title),
                done: Boolean(task.done),
                ...(task.carriedFrom ? { carriedFrom: String(task.carriedFrom) } : {}),
              }))
          : [],
        rolled: true,
      };
    }
  }

  const reminders = Array.isArray(data.reminders)
    ? data.reminders
        .filter((item) => item && String(item.title || "").trim())
        .map((item) => {
          const repeat = item.repeat === "once" || item.repeat === "days" ? item.repeat : "daily";
          return {
            id: String(item.id || uid()),
            title: String(item.title).trim(),
            time: /^\d{2}:\d{2}$/.test(item.time) ? item.time : "09:00",
            repeat,
            days: repeat === "days" ? normalizeDays(item.days) : [],
            date: repeat === "once" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : null,
            enabled: item.enabled !== false,
          };
        })
    : [];

  write({ version: 1, areas, logs, reminders });
  return { ok: true };
}

export function syncMostakRemindersToSW(reminders = peekReminders()) {
  const payload = JSON.stringify(reminders || []);
  if (typeof caches !== "undefined") {
    caches
      .open("cis-app-settings")
      .then((cache) =>
        cache.put(
          "mostak-reminders",
          new Response(payload, { headers: { "Content-Type": "application/json" } })
        )
      )
      .catch(() => {});
  }
  if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SYNC_MOSTAK_REMINDERS",
      reminders: reminders || [],
    });
  }
}

export function repeatLabel(reminder) {
  if (reminder.repeat === "once") {
    if (!reminder.date) return "Once";
    const [year, month, day] = reminder.date.split("-").map(Number);
    const when = new Date(year, (month || 1) - 1, day || 1);
    const pretty = when.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `Once · ${pretty}`;
  }
  if (reminder.repeat === "days") {
    const names = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const picked = normalizeDays(reminder.days).map((day) => names[day]);
    return picked.length ? picked.join(" ") : "Selected days";
  }
  return "Every day";
}

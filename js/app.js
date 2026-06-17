import { App } from "@capacitor/app";
import { ROUTINE } from "./routine-data.js";
import {
  PRESET_OFFSETS,
  loadReminderSettings,
  getReminderSummaryText,
  togglePresetOffset,
  addCustomOffset,
  removeCustomOffset,
  formatOffsetLabel,
  getEnabledReminderOffsets,
  syncReminderSettingsToSW,
} from "./reminder-settings.js";
import {
  initBroadcast,
  sendBroadcast,
  getSubscriberCount,
  getBroadcastStatusText,
  isBroadcastConfigured,
} from "./broadcast.js";
import {
  formatCountdown,
  getTodayEvents,
  getCurrentEvent,
  getNextEvent,
  getCountdownTo,
  getUpcomingEvents,
  checkReminders,
  getCellContent,
  isSlotActive,
  isSlotPast,
} from "./scheduler.js";
import {
  isNativePlatform,
  getPermissionStatus,
  requestPermission,
  showNotification,
  scheduleNativeReminders,
  initNotifications,
  getNotificationBadgeClass,
  getNotificationBadgeText,
  refreshNativePermission,
} from "./notifications.js";

const TICK_MS = 30000;
let selectedDayIndex = new Date().getDay();

function getCourseType(title) {
  if (title.startsWith("DM")) return "dm";
  if (title.includes("COUNSELING")) return "counseling";
  if (title.includes("MIS")) return "mis";
  return "off";
}

function getTypeLabel(type) {
  const map = { mis: "Lecture", dm: "Lab", counseling: "Counseling", off: "Off" };
  return map[type] || "";
}

function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatShortDay(dayIndex) {
  return ROUTINE.dayLabels[dayIndex].slice(0, 3);
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach((el) => {
    const isActive = el.id === `view-${viewName}`;
    el.classList.toggle("active", isActive);
    el.hidden = !isActive;
  });

  document.querySelectorAll(".nav-item").forEach((btn) => {
    const active = btn.dataset.view === viewName;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-current", active ? "page" : null);
  });
}

function initNavigation() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}

function renderHeroChips(next) {
  const container = document.getElementById("next-chips");
  container.innerHTML = "";
  if (!next) return;

  const type = getCourseType(next.title);
  const chips = [
    { icon: "bi-bookmark-fill", text: getTypeLabel(type), cls: `chip-type-${type}` },
  ];
  if (next.room) chips.push({ icon: "bi-geo-alt-fill", text: `Room ${next.room}`, cls: "" });
  chips.push({ icon: "bi-calendar3", text: next.dayLabel, cls: "" });

  chips.forEach((c) => {
    const span = document.createElement("span");
    span.className = `chip ${c.cls}`.trim();
    span.innerHTML = `<i class="bi ${c.icon}"></i>${c.text}`;
    container.appendChild(span);
  });
}

function renderLiveTracking(now) {
  const { special, event: current } = getCurrentEvent(now);
  const next = getNextEvent(now);

  const currentStatus = document.getElementById("current-status");
  const currentMeta = document.getElementById("current-meta");
  const nextTitle = document.getElementById("next-title");
  const nextMeta = document.getElementById("next-meta");
  const countdown = document.getElementById("countdown");
  const heroEyebrow = document.getElementById("hero-eyebrow");
  const nowCard = document.getElementById("now-card");
  const progressTrack = document.getElementById("progress-track");
  const progressFill = document.getElementById("progress-fill");
  const progressLabel = document.getElementById("progress-label");
  const topbarChip = document.getElementById("topbar-chip");
  const topbarText = document.getElementById("topbar-status-text");

  nowCard.classList.remove("is-active");
  progressTrack.hidden = true;
  progressLabel.hidden = true;
  topbarChip.className = "topbar-status";

  if (special) {
    currentStatus.textContent = special.label;
    currentMeta.textContent = ROUTINE.dayLabels[now.getDay()];
    topbarChip.classList.add("is-off");
    topbarText.textContent = special.label;
  } else if (current) {
    currentStatus.textContent = current.title;
    currentMeta.textContent = [current.timeRange, current.room ? `Room ${current.room}` : null]
      .filter(Boolean)
      .join(" · ");
    nowCard.classList.add("is-active");
    topbarChip.classList.add("is-class");
    topbarText.textContent = "In class";

    const total = current.end - current.start;
    const elapsed = now - current.start;
    const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    const remainMin = Math.ceil((current.end - now) / 60000);
    progressTrack.hidden = false;
    progressLabel.hidden = false;
    progressFill.style.width = `${pct}%`;
    progressLabel.textContent = `${remainMin} min remaining`;
  } else {
    currentStatus.textContent = "No class right now";
    currentMeta.textContent = "You're free until the next slot";
    topbarChip.classList.add("is-live");
    topbarText.textContent = "Live";
  }

  if (next) {
    nextTitle.textContent = next.title;
    nextMeta.textContent = [next.timeRange, next.room ? `Room ${next.room}` : null]
      .filter(Boolean)
      .join(" · ");
    countdown.textContent = formatCountdown(getCountdownTo(next, now));
    heroEyebrow.textContent = "Next class starts in";
    renderHeroChips(next);
  } else {
    nextTitle.textContent = "No upcoming class";
    nextMeta.textContent = "Enjoy your break";
    countdown.textContent = "--:--:--";
    heroEyebrow.textContent = "Schedule clear";
    document.getElementById("next-chips").innerHTML = "";
  }
}

function renderTodayList(now) {
  const list = document.getElementById("today-list");
  document.getElementById("today-date").textContent = formatDateLabel(now);
  const { special, events } = getTodayEvents(now);
  list.innerHTML = "";

  if (special) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.innerHTML = `<i class="bi bi-emoji-smile" style="font-size:1.5rem;display:block;margin-bottom:0.5rem"></i>${special.label}`;
    list.appendChild(empty);
    return;
  }

  if (!events.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No classes scheduled today";
    list.appendChild(empty);
    return;
  }

  events.forEach((event) => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.setAttribute("role", "listitem");
    if (isSlotActive(event, now)) item.classList.add("is-active");
    if (isSlotPast(event, now)) item.classList.add("is-past");
    const type = getCourseType(event.title);
    item.innerHTML = `
      <div class="timeline-rail"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
      <div class="timeline-body">
        <div class="timeline-time">${event.timeRange}</div>
        <p class="timeline-title">${event.title}</p>
        ${event.room ? `<div class="timeline-room"><i class="bi bi-geo-alt"></i> Room ${event.room}</div>` : ""}
        <span class="type-badge type-${type}">${getTypeLabel(type)}</span>
      </div>`;
    list.appendChild(item);
  });
}

function renderDayPills(now) {
  const container = document.getElementById("day-pills");
  container.innerHTML = "";
  const todayIndex = now.getDay();

  for (let i = 0; i < 7; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-pill";
    btn.setAttribute("role", "tab");
    if (i === todayIndex) btn.classList.add("is-today");
    if (i === selectedDayIndex) btn.classList.add("active");
    const special = ROUTINE.specialDays[i];
    const slotCount = ROUTINE.week[i]?.length ?? 0;
    btn.innerHTML = `${formatShortDay(i)}<span class="pill-sub">${special ? special.label : slotCount + " slots"}</span>`;
    btn.addEventListener("click", () => {
      selectedDayIndex = i;
      renderDayPills(now);
      renderDayDetail(i);
    });
    container.appendChild(btn);
  }
}

function renderDayDetail(dayIndex) {
  const nameEl = document.getElementById("day-detail-name");
  const slotsEl = document.getElementById("day-slots");
  const special = ROUTINE.specialDays[dayIndex];
  nameEl.textContent = ROUTINE.dayLabels[dayIndex];
  slotsEl.innerHTML = "";

  if (special) {
    slotsEl.innerHTML = `<div class="timeline-empty">${special.label}</div>`;
    return;
  }

  const entries = ROUTINE.week[dayIndex] || [];
  if (!entries.length) {
    slotsEl.innerHTML = `<div class="timeline-empty">No classes</div>`;
    return;
  }

  entries.forEach((entry) => {
    const slot = ROUTINE.slots[entry.slot];
    const type = getCourseType(entry.title);
    const row = document.createElement("div");
    row.className = "day-slot-row";
    row.innerHTML = `
      <div class="day-slot-time">${slot.label.split(" - ")[0]}</div>
      <div class="day-slot-info">
        <p class="day-slot-title">${entry.title}</p>
        ${entry.room ? `<div class="timeline-room"><i class="bi bi-geo-alt"></i> Room ${entry.room}</div>` : ""}
        <span class="type-badge type-${type}">${getTypeLabel(type)}</span>
      </div>`;
    slotsEl.appendChild(row);
  });
}

function getCellClass(title) {
  const type = getCourseType(title);
  if (type === "mis") return "cell-mis";
  if (type === "dm") return "cell-dm";
  if (type === "counseling") return "cell-counseling";
  return "";
}

function renderRoutineTable(now) {
  const tbody = document.getElementById("routine-body");
  tbody.innerHTML = "";
  const slotOrder = ["s1", "s2", "s3", "s4", "s5"];
  const todayIndex = now.getDay();

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const tr = document.createElement("tr");
    if (dayIndex === todayIndex) tr.classList.add("is-today-row");
    const th = document.createElement("th");
    th.textContent = formatShortDay(dayIndex).toUpperCase();
    tr.appendChild(th);
    const special = ROUTINE.specialDays[dayIndex];

    if (special) {
      const td = document.createElement("td");
      td.colSpan = 5;
      td.className = "special-day";
      td.textContent = special.label;
      tr.appendChild(td);
    } else {
      slotOrder.forEach((slotId) => {
        const td = document.createElement("td");
        const content = getCellContent(dayIndex, slotId);
        if (content) {
          td.className = getCellClass(content.title);
          td.textContent = content.title;
          if (content.room) {
            const span = document.createElement("span");
            span.className = "room-tag";
            span.textContent = `R${content.room}`;
            td.appendChild(span);
          }
        }
        tr.appendChild(td);
      });
    }
    tbody.appendChild(tr);
  }
}

function updateReminderUI() {
  const summary = document.getElementById("reminder-summary");
  const infoDesc = document.getElementById("info-reminder-desc");
  const text = getReminderSummaryText();
  if (summary) summary.textContent = text;
  if (infoDesc) infoDesc.textContent = text;

  const container = document.getElementById("reminder-toggles");
  const settings = loadReminderSettings();
  container.innerHTML = "";

  PRESET_OFFSETS.forEach(({ minutes, label }) => {
    const row = document.createElement("div");
    row.className = "reminder-toggle-row";
    const lbl = document.createElement("span");
    lbl.className = "reminder-toggle-label";
    lbl.textContent = label;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-toggle";
    btn.setAttribute("aria-pressed", settings.presets[minutes] ? "true" : "false");
    btn.innerHTML = '<span class="toggle-track"><span class="toggle-thumb"></span></span>';
    btn.addEventListener("click", async () => {
      const enabled = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", enabled ? "true" : "false");
      togglePresetOffset(minutes, enabled);
      updateReminderUI();
      if ((await getPermissionStatus()) === "granted") {
        await scheduleNativeReminders(getUpcomingEvents(14));
      }
    });
    row.appendChild(lbl);
    row.appendChild(btn);
    container.appendChild(row);
  });

  const chipsEl = document.getElementById("custom-chips");
  chipsEl.innerHTML = "";
  settings.custom.forEach((minutes) => {
    const chip = document.createElement("span");
    chip.className = "offset-chip";
    chip.innerHTML = `${formatOffsetLabel(minutes)} before <button type="button" aria-label="Remove">&times;</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      removeCustomOffset(minutes);
      updateReminderUI();
    });
    chipsEl.appendChild(chip);
  });
}

function initReminderSettings() {
  updateReminderUI();
  document.getElementById("btn-add-reminder").addEventListener("click", () => {
    const input = document.getElementById("custom-minutes");
    const result = addCustomOffset(input.value);
    if (!result.ok) {
      showBroadcastFeedback(result.error, "error");
      return;
    }
    input.value = "";
    updateReminderUI();
    showBroadcastFeedback("Custom reminder added", "success");
  });
}

function showBroadcastFeedback(msg, type) {
  const el = document.getElementById("broadcast-feedback");
  el.hidden = false;
  el.textContent = msg;
  el.className = `broadcast-feedback is-${type}`;
  setTimeout(() => { el.hidden = true; }, 4000);
}

async function updateBroadcastUI() {
  const statusEl = document.getElementById("broadcast-status");
  if (statusEl) statusEl.textContent = await getBroadcastStatusText();

  const countEl = document.getElementById("subscriber-count");
  if (isBroadcastConfigured()) {
    const count = await getSubscriberCount();
    if (count !== null) {
      countEl.hidden = false;
      countEl.textContent = `${count} subscribed device${count === 1 ? "" : "s"}`;
    }
  } else {
    countEl.hidden = true;
  }
}

function initBroadcastUI() {
  document.getElementById("btn-broadcast").addEventListener("click", async () => {
    const pin = document.getElementById("admin-pin").value;
    const message = document.getElementById("broadcast-message").value;
    const btn = document.getElementById("btn-broadcast");
    btn.disabled = true;
    try {
      const result = await sendBroadcast(message, pin);
      if (!result.ok) {
        showBroadcastFeedback(result.error, "error");
        return;
      }
      if (result.mode === "firebase") {
        showBroadcastFeedback("Sent to all subscribed devices", "success");
        document.getElementById("broadcast-message").value = "";
      } else {
        showBroadcastFeedback(result.warning || "Sent locally", "warn");
      }
    } catch {
      showBroadcastFeedback("Send failed — check Firebase config", "error");
    } finally {
      btn.disabled = false;
    }
  });
}

function getBlockedStepsHtml() {
  if (isNativePlatform()) {
    return [
      "Phone Settings → Apps → CIS Routine → Notifications → Allow",
      "Also check: Alarms & reminders (if shown on your device)",
      "Return here and tap Check again",
    ];
  }

  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return [
      "Settings → Notifications → Safari (or Chrome)",
      "Allow notifications for this site",
      "Safari: address bar → aA → Website Settings → Allow",
    ];
  }
  if (/android/.test(ua)) {
    return [
      "Chrome: tap lock icon → Permissions → Notifications → Allow",
      "Chrome → Site settings → Notifications → mostakahmad.github.io → Allow",
      "PWA: Phone Settings → Apps → CIS Routine → Notifications → On",
    ];
  }
  return [
    "Click lock icon in address bar → Site settings → Notifications → Allow",
    "Chrome: Settings → Privacy → Site settings → Notifications",
  ];
}

async function renderBlockedHelp() {
  const help = document.getElementById("notif-blocked-help");
  const steps = document.getElementById("blocked-steps");
  if (!help || !steps) return;

  const status = await getPermissionStatus();
  if (status === "denied") {
    help.hidden = false;
    steps.innerHTML = getBlockedStepsHtml().map((s) => `<li>${s}</li>`).join("");
  } else {
    help.hidden = true;
  }
}

async function recheckPermission() {
  await refreshNativePermission();
  await updateNotificationBadge();

  const status = await getPermissionStatus();
  if (status === "granted") {
    await onRemindersGranted();
    showBroadcastFeedback("Notifications enabled!", "success");
    return;
  }
  if (status === "default") {
    await onEnableReminders();
    return;
  }
  showBroadcastFeedback("Still blocked — follow steps above", "warn");
}

async function updateNotificationBadge() {
  const badge = document.getElementById("notif-badge");
  const btn = document.getElementById("btn-enable");
  const status = await getPermissionStatus();

  badge.className = `status-pill ${getNotificationBadgeClass(status)}`;
  badge.textContent = getNotificationBadgeText(status);

  if (status === "granted") {
    btn.setAttribute("aria-pressed", "true");
    btn.disabled = true;
  } else if (status === "denied") {
    btn.setAttribute("aria-pressed", "false");
    btn.disabled = true;
    badge.textContent = isNativePlatform()
      ? "Blocked — enable in phone settings"
      : "Blocked — enable in settings";
  } else {
    btn.setAttribute("aria-pressed", "false");
    btn.disabled = false;
  }

  await renderBlockedHelp();
}

async function onRemindersGranted() {
  const events = getUpcomingEvents(14);
  await scheduleNativeReminders(events);
  if (!isNativePlatform()) {
    await syncReminderSettingsToSW();
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CHECK_REMINDERS" });
    }
  }
  initBroadcast();
  await updateBroadcastUI();
}

function tick() {
  const now = new Date();
  renderLiveTracking(now);
  renderTodayList(now);
  renderDayPills(now);
  renderDayDetail(selectedDayIndex);
  renderRoutineTable(now);

  checkReminders(now, (message) => {
    showNotification(message.title, { body: message.body, tag: message.title });
  });
}

async function onEnableReminders() {
  const permission = await requestPermission();
  await updateNotificationBadge();

  if (permission === "granted") {
    await onRemindersGranted();
    const offsets = getEnabledReminderOffsets().map(formatOffsetLabel).join(", ");
    showNotification("Reminders enabled", {
      body: `Alerts: ${offsets} before each class.`,
      tag: "reminder-enabled",
    });
  }
}

async function onAppResume() {
  await refreshNativePermission();
  await updateNotificationBadge();
  const status = await getPermissionStatus();
  if (status === "granted") {
    await scheduleNativeReminders(getUpcomingEvents(14));
    initBroadcast();
    await updateBroadcastUI();
  }
  tick();
}

function initCapacitorLifecycle() {
  if (!isNativePlatform()) return;

  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) onAppResume();
  });
}

async function init() {
  document.getElementById("dept-title").textContent = ROUTINE.department;
  document.getElementById("term-label").textContent = ROUTINE.term;
  document.getElementById("footer-note").textContent = ROUTINE.footerNote;

  selectedDayIndex = new Date().getDay();
  initNavigation();
  initReminderSettings();
  initBroadcastUI();
  initCapacitorLifecycle();

  await updateNotificationBadge();
  await updateBroadcastUI();
  tick();

  document.getElementById("btn-enable").addEventListener("click", onEnableReminders);
  document.getElementById("btn-recheck-permission").addEventListener("click", recheckPermission);

  setInterval(tick, TICK_MS);
  setInterval(() => {
    const now = new Date();
    const next = getNextEvent(now);
    const countdown = document.getElementById("countdown");
    if (next) countdown.textContent = formatCountdown(getCountdownTo(next, now));

    const { event: current } = getCurrentEvent(now);
    if (current) {
      const progressFill = document.getElementById("progress-fill");
      const progressLabel = document.getElementById("progress-label");
      const total = current.end - current.start;
      const elapsed = now - current.start;
      const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
      const remainMin = Math.ceil((current.end - now) / 60000);
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressLabel) progressLabel.textContent = `${remainMin} min remaining`;
    }
  }, 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) onAppResume();
  });

  await initNotifications();
  if ((await getPermissionStatus()) === "granted") {
    initBroadcast();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch(console.error);
});

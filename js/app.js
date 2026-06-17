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
  const chips = [];

  chips.push({
    icon: "bi-bookmark-fill",
    text: getTypeLabel(type),
    cls: `chip-type-${type}`,
  });

  if (next.room) {
    chips.push({ icon: "bi-geo-alt-fill", text: `Room ${next.room}`, cls: "" });
  }

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
    currentMeta.textContent = [
      current.timeRange,
      current.room ? `Room ${current.room}` : null,
    ]
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
  const dateLabel = document.getElementById("today-date");
  dateLabel.textContent = formatDateLabel(now);

  const { special, events } = getTodayEvents(now);
  list.innerHTML = "";

  if (special) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.innerHTML = `<i class="bi bi-emoji-smile" style="font-size:1.5rem;display:block;margin-bottom:0.5rem"></i>${special.label}`;
    list.appendChild(empty);
    return;
  }

  if (events.length === 0) {
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
      <div class="timeline-rail">
        <div class="timeline-dot"></div>
        <div class="timeline-line"></div>
      </div>
      <div class="timeline-body">
        <div class="timeline-time">${event.timeRange}</div>
        <p class="timeline-title">${event.title}</p>
        ${event.room ? `<div class="timeline-room"><i class="bi bi-geo-alt"></i> Room ${event.room}</div>` : ""}
        <span class="type-badge type-${type}">${getTypeLabel(type)}</span>
      </div>
    `;

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
    btn.dataset.day = i;

    if (i === todayIndex) btn.classList.add("is-today");
    if (i === selectedDayIndex) btn.classList.add("active");

    const special = ROUTINE.specialDays[i];
    const slotCount = ROUTINE.week[i]?.length ?? 0;
    btn.innerHTML = `
      ${formatShortDay(i)}
      <span class="pill-sub">${special ? special.label : slotCount + " slots"}</span>
    `;

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
  if (entries.length === 0) {
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
      </div>
    `;
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

function updateNotificationBadge() {
  const badge = document.getElementById("notif-badge");
  const btn = document.getElementById("btn-enable");
  const status = getPermissionStatus();

  badge.className = `status-pill ${getNotificationBadgeClass(status)}`;
  badge.textContent = getNotificationBadgeText(status);

  if (status === "granted") {
    btn.setAttribute("aria-pressed", "true");
    btn.disabled = true;
  } else if (status === "denied") {
    btn.setAttribute("aria-pressed", "false");
    btn.disabled = true;
    badge.textContent = "Blocked — enable in settings";
  } else {
    btn.setAttribute("aria-pressed", "false");
    btn.disabled = false;
  }
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
  updateNotificationBadge();

  if (permission === "granted") {
    const events = getUpcomingEvents(14);
    await scheduleNativeReminders(events);

    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CHECK_REMINDERS" });
    }

    showNotification("Reminders enabled", {
      body: "You will be notified 2 hours and 30 minutes before each class.",
      tag: "reminder-enabled",
    });
  }
}

function init() {
  document.getElementById("dept-title").textContent = ROUTINE.department;
  document.getElementById("term-label").textContent = ROUTINE.term;
  document.getElementById("footer-note").textContent = ROUTINE.footerNote;

  selectedDayIndex = new Date().getDay();

  initNavigation();
  updateNotificationBadge();
  tick();

  document.getElementById("btn-enable").addEventListener("click", onEnableReminders);

  setInterval(tick, TICK_MS);

  setInterval(() => {
    const now = new Date();
    const next = getNextEvent(now);
    const countdown = document.getElementById("countdown");
    if (next) {
      countdown.textContent = formatCountdown(getCountdownTo(next, now));
    }

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
    if (!document.hidden) tick();
  });

  initNotifications();
}

document.addEventListener("DOMContentLoaded", init);

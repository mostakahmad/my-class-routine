const CHECK_WINDOW_MINUTES = 1;

function parseTimeOnDate(date, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function formatTime12(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function eventKey(dayIndex, slotId, title) {
  return `${dayIndex}_${slotId}_${title.replace(/\s+/g, "_")}`;
}

function buildEvent(dayIndex, entry, date) {
  const slot = ROUTINE.slots[entry.slot];
  const start = parseTimeOnDate(date, slot.start);
  const end = parseTimeOnDate(date, slot.end);
  return {
    id: eventKey(dayIndex, entry.slot, entry.title),
    dayIndex,
    dayLabel: ROUTINE.dayLabels[dayIndex],
    slotId: entry.slot,
    title: entry.title,
    room: entry.room || null,
    start,
    end,
    startLabel: slot.label,
    timeRange: `${formatTime12(slot.start)} – ${formatTime12(slot.end)}`,
  };
}

function getEventsForDay(dayIndex, refDate) {
  const special = ROUTINE.specialDays[dayIndex];
  if (special) {
    return { special, events: [] };
  }

  const entries = ROUTINE.week[dayIndex] || [];
  const date = new Date(refDate);
  const dayDiff = dayIndex - date.getDay();
  date.setDate(date.getDate() + dayDiff);
  date.setHours(0, 0, 0, 0);

  const events = entries.map((entry) => buildEvent(dayIndex, entry, date));
  return { special: null, events };
}

function getTodayEvents(now = new Date()) {
  const dayIndex = now.getDay();
  const { special, events } = getEventsForDay(dayIndex, now);
  return { special, events, dayIndex };
}

function getCurrentEvent(now = new Date()) {
  const { special, events } = getTodayEvents(now);
  if (special) return { special, event: null };

  const current = events.find((e) => now >= e.start && now < e.end);
  return { special: null, event: current || null };
}

function getUpcomingEvents(daysAhead = 7, now = new Date()) {
  const result = [];
  for (let i = 0; i <= daysAhead; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const dayIndex = date.getDay();
    const { special, events } = getEventsForDay(dayIndex, date);
    if (!special) {
      events.forEach((e) => {
        if (e.start > now) result.push(e);
      });
    }
  }
  result.sort((a, b) => a.start - b.start);
  return result;
}

function getNextEvent(now = new Date()) {
  const upcoming = getUpcomingEvents(7, now);
  return upcoming[0] || null;
}

function getCountdownTo(event, now = new Date()) {
  if (!event) return null;
  return event.start - now;
}

function notifiedKey(event, offsetMinutes) {
  const dateStr = event.start.toISOString().slice(0, 10);
  return `notified_${dateStr}_${event.id}_${offsetMinutes}`;
}

function wasNotified(event, offsetMinutes) {
  return localStorage.getItem(notifiedKey(event, offsetMinutes)) === "1";
}

function markNotified(event, offsetMinutes) {
  localStorage.setItem(notifiedKey(event, offsetMinutes), "1");
}

function buildReminderMessage(event, offsetMinutes) {
  const roomPart = event.room ? ` — Room ${event.room}` : "";
  const label = formatOffsetLabel(offsetMinutes);
  return {
    title: `Class in ${label}`,
    body: `${event.title}${roomPart} · ${event.timeRange}`,
  };
}

function checkReminders(now = new Date(), onReminder) {
  const offsets = getEnabledReminderOffsets();
  if (!offsets.length) return [];

  const upcoming = getUpcomingEvents(1, now);
  const fired = [];

  upcoming.forEach((event) => {
    offsets.forEach((offset) => {
      const reminderTime = new Date(event.start.getTime() - offset * 60 * 1000);
      const windowEnd = new Date(
        reminderTime.getTime() + CHECK_WINDOW_MINUTES * 60 * 1000
      );

      if (now >= reminderTime && now < windowEnd && !wasNotified(event, offset)) {
        const message = buildReminderMessage(event, offset);
        markNotified(event, offset);
        fired.push({ event, offset, message });
        if (onReminder) onReminder(message, event, offset);
      }
    });
  });

  return fired;
}

function getCellContent(dayIndex, slotId) {
  const special = ROUTINE.specialDays[dayIndex];
  if (special) return null;

  const entries = ROUTINE.week[dayIndex] || [];
  const entry = entries.find((e) => e.slot === slotId);
  if (!entry) return null;

  return {
    title: entry.title,
    room: entry.room || null,
  };
}

function isSlotActive(event, now = new Date()) {
  return now >= event.start && now < event.end;
}

function isSlotPast(event, now = new Date()) {
  return now >= event.end;
}

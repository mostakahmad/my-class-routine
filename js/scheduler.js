import { ROUTINE, TYPE_META } from "./routine-data.js";
import { formatOffsetLabel, getEnabledReminderOffsets } from "./reminder-settings.js";

const CHECK_WINDOW_MINUTES = 1;
const EVENING_PROFILE_KEY = "evening_profile";

let runtimeEveningProfile = "nocook";

export function getEveningProfile() {
  if (typeof localStorage !== "undefined") {
    try {
      const saved = localStorage.getItem(EVENING_PROFILE_KEY);
      if (saved === "cooking" || saved === "nocook") return saved;
    } catch {
      /* private mode or service worker */
    }
  }
  return runtimeEveningProfile === "cooking" ? "cooking" : "nocook";
}

export function setRuntimeEveningProfile(profile) {
  runtimeEveningProfile = profile === "cooking" ? "cooking" : "nocook";
}

export function setEveningProfile(profile) {
  const next = profile === "cooking" ? "cooking" : "nocook";
  runtimeEveningProfile = next;
  try {
    localStorage.setItem(EVENING_PROFILE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export async function syncEveningProfileToSW(profile = getEveningProfile()) {
  try {
    const cache = await caches.open("cis-app-settings");
    await cache.put(
      "evening-profile",
      new Response(profile, { headers: { "Content-Type": "text/plain" } })
    );
  } catch {
    /* cache unavailable on native */
  }

  if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SYNC_EVENING_PROFILE",
      profile,
    });
  }
}

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

export function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function eventKey(dayIndex, start, title) {
  return `${dayIndex}_${start}_${title.replace(/\s+/g, "_")}`;
}

export function formatPlace(entry) {
  if (entry.room) return `Room ${entry.room}`;
  if (entry.place === "home") return "At home";
  if (entry.place === "no-desk") return "No desk";
  return null;
}

function buildEvent(dayIndex, entry, date) {
  const start = parseTimeOnDate(date, entry.start);
  const end = parseTimeOnDate(date, entry.end);
  if (end <= start) end.setDate(end.getDate() + 1);

  return {
    id: eventKey(dayIndex, entry.start, entry.title),
    dayIndex,
    dayLabel: ROUTINE.dayLabels[dayIndex],
    title: entry.title,
    type: entry.type,
    room: entry.room || null,
    place: entry.place || (entry.room ? "room" : null),
    placeLabel: formatPlace(entry),
    segment: entry.segment || "day",
    startClock: entry.start,
    endClock: entry.end,
    grid: entry.grid || null,
    start,
    end,
    timeRange: `${formatTime12(entry.start)} – ${formatTime12(entry.end)}`,
  };
}

export function getEventsForDay(dayIndex, refDate) {
  const special = ROUTINE.specialDays[dayIndex];
  if (special) {
    return { special, events: [] };
  }

  const date = new Date(refDate);
  const dayDiff = dayIndex - date.getDay();
  date.setDate(date.getDate() + dayDiff);
  date.setHours(0, 0, 0, 0);

  const profile = getEveningProfile();
  const entries = [
    ...(ROUTINE.week[dayIndex] || []),
    ...(ROUTINE.evening[profile] || []),
  ];
  const events = entries
    .map((entry) => buildEvent(dayIndex, entry, date))
    .sort((a, b) => a.start - b.start);

  return { special: null, events };
}

export function getTodayEvents(now = new Date()) {
  const dayIndex = now.getDay();
  const { special, events } = getEventsForDay(dayIndex, now);
  if (special) return { special, events, dayIndex };

  const prevDate = new Date(now);
  prevDate.setDate(prevDate.getDate() - 1);
  const previous = getEventsForDay(prevDate.getDay(), prevDate);
  const carry = previous.events
    .filter((event) => event.start <= now && event.end > now)
    .map((event) => ({ ...event, segment: "carry" }));

  return {
    special: null,
    events: [...carry, ...events].sort((a, b) => a.start - b.start),
    dayIndex,
  };
}

export function getCurrentEvent(now = new Date()) {
  const { special, events } = getTodayEvents(now);
  if (special) return { special, event: null };

  const current = events.find((event) => now >= event.start && now < event.end);
  return { special: null, event: current || null };
}

export function getUpcomingEvents(daysAhead = 7, now = new Date()) {
  const result = [];
  for (let i = 0; i <= daysAhead; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const dayIndex = date.getDay();
    const { special, events } = getEventsForDay(dayIndex, date);
    if (!special) {
      events.forEach((event) => {
        if (event.start > now) result.push(event);
      });
    }
  }
  result.sort((a, b) => a.start - b.start);
  return result;
}

export function getNextEvent(now = new Date()) {
  const upcoming = getUpcomingEvents(7, now);
  return upcoming[0] || null;
}

export function getCountdownTo(event, now = new Date()) {
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

export function buildReminderMessage(event, offsetMinutes) {
  const reminder = TYPE_META[event.type]?.reminder || "Up next";
  const placePart = event.placeLabel ? ` — ${event.placeLabel}` : "";
  const label = formatOffsetLabel(offsetMinutes);
  return {
    title: `${reminder} in ${label}`,
    body: `${event.title}${placePart} · ${event.timeRange}`,
  };
}

export function checkReminders(now = new Date(), onReminder) {
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

export function getCellContent(dayIndex, slotId) {
  const special = ROUTINE.specialDays[dayIndex];
  if (special) return null;

  const order = ROUTINE.slotOrder;
  const target = order.indexOf(slotId);
  if (target < 0) return null;

  const entries = ROUTINE.week[dayIndex] || [];
  const entry = entries.find((item) => {
    if (!item.grid) return false;
    const start = order.indexOf(item.grid.slot);
    const span = item.grid.span || 1;
    return target >= start && target < start + span;
  });
  if (!entry) return null;

  return {
    title: entry.title,
    room: entry.room || null,
    type: entry.type,
    place: entry.place || null,
  };
}

export function isSlotActive(event, now = new Date()) {
  return now >= event.start && now < event.end;
}

export function isSlotPast(event, now = new Date()) {
  return now >= event.end;
}

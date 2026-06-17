const REMINDER_SETTINGS_KEY = "cis_reminder_settings";

export const PRESET_OFFSETS = [
  { minutes: 120, label: "2 hours before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 15, label: "15 minutes before" },
];

const DEFAULT_SETTINGS = {
  presets: { 120: true, 60: true, 30: true, 15: true },
  custom: [],
};

export function loadReminderSettings() {
  try {
    const raw = localStorage.getItem(REMINDER_SETTINGS_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    return {
      presets: { ...DEFAULT_SETTINGS.presets, ...parsed.presets },
      custom: Array.isArray(parsed.custom) ? parsed.custom : [],
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

function saveReminderSettings(settings) {
  localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
  syncReminderSettingsToSW();
}

export function getEnabledReminderOffsets() {
  const settings = loadReminderSettings();
  const offsets = [];

  PRESET_OFFSETS.forEach(({ minutes }) => {
    if (settings.presets[minutes]) offsets.push(minutes);
  });

  settings.custom.forEach((m) => {
    const n = Number(m);
    if (n > 0 && n <= 1440 && !offsets.includes(n)) offsets.push(n);
  });

  return offsets.sort((a, b) => b - a);
}

export function formatOffsetLabel(minutes) {
  if (minutes >= 60 && minutes % 60 === 0) {
    const h = minutes / 60;
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  return `${minutes} min`;
}

export function togglePresetOffset(minutes, enabled) {
  const settings = loadReminderSettings();
  settings.presets[minutes] = enabled;
  saveReminderSettings(settings);
}

export function addCustomOffset(minutes) {
  const n = Math.round(Number(minutes));
  if (!n || n < 1 || n > 1440) return { ok: false, error: "Enter 1–1440 minutes" };

  const settings = loadReminderSettings();
  const exists =
    settings.custom.includes(n) ||
    PRESET_OFFSETS.some((p) => p.minutes === n && settings.presets[n]);

  if (exists) return { ok: false, error: "Already added" };

  settings.custom.push(n);
  settings.custom.sort((a, b) => b - a);
  saveReminderSettings(settings);
  return { ok: true };
}

export function removeCustomOffset(minutes) {
  const settings = loadReminderSettings();
  settings.custom = settings.custom.filter((m) => m !== minutes);
  saveReminderSettings(settings);
}

export async function syncReminderSettingsToSW() {
  const offsets = getEnabledReminderOffsets();

  try {
    const cache = await caches.open("cis-app-settings");
    await cache.put(
      "reminder-offsets",
      new Response(JSON.stringify(offsets), {
        headers: { "Content-Type": "application/json" },
      })
    );
  } catch {
    /* cache unavailable on native */
  }

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SYNC_REMINDER_SETTINGS",
      offsets,
    });
  }
}

export function getReminderSummaryText() {
  const offsets = getEnabledReminderOffsets();
  if (!offsets.length) return "No reminders enabled";
  return offsets.map(formatOffsetLabel).join(" · ") + " before";
}

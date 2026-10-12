import {
  buildReminderMessage,
  getUpcomingEvents,
  setRuntimeEveningProfile,
} from "./js/scheduler.js";

const CACHE_NAME = "cis-routine-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./assets/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/og-image.png",
];

let cachedReminderOffsets = [120, 60, 30, 15];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== "cis-app-settings" && k !== "notif-keys").map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
  startReminderLoop();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, icon, tag } = event.data.payload;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: icon || "./icons/icon-192.png",
        badge: icon || "./icons/icon-192.png",
        tag: tag || "cis-routine",
        vibrate: [200, 100, 200],
      })
    );
  }

  if (event.data?.type === "CHECK_REMINDERS") {
    event.waitUntil(runBackgroundCheck());
  }

  if (event.data?.type === "SYNC_REMINDER_SETTINGS") {
    if (Array.isArray(event.data.offsets)) {
      cachedReminderOffsets = event.data.offsets;
    }
  }

  if (event.data?.type === "SYNC_EVENING_PROFILE") {
    setRuntimeEveningProfile(event.data.profile);
  }

  if (event.data?.type === "LOCAL_BROADCAST") {
    const { title, body, tag } = event.data.payload;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: "./icons/icon-192.png",
        tag: tag || "broadcast",
        vibrate: [300, 100, 300],
      })
    );
  }
});

let reminderInterval = null;

function startReminderLoop() {
  if (reminderInterval) return;
  reminderInterval = setInterval(() => {
    runBackgroundCheck();
  }, 30000);
}

async function loadReminderOffsets() {
  try {
    const cache = await caches.open("cis-app-settings");
    const res = await cache.match("reminder-offsets");
    if (res) {
      const offsets = await res.json();
      if (Array.isArray(offsets) && offsets.length) {
        cachedReminderOffsets = offsets;
      }
    }
  } catch {
    /* use defaults */
  }
  return cachedReminderOffsets;
}

async function loadEveningProfile() {
  try {
    const cache = await caches.open("cis-app-settings");
    const res = await cache.match("evening-profile");
    if (res) setRuntimeEveningProfile((await res.text()).trim());
  } catch {
    /* default nocook */
  }
}

async function runBackgroundCheck() {
  const clients = await self.clients.matchAll({ type: "window" });
  if (clients.length > 0) return;

  const offsets = await loadReminderOffsets();
  if (!offsets.length) return;

  await loadEveningProfile();
  const now = new Date();
  const upcoming = getUpcomingEvents(1, now);

  for (const event of upcoming) {
    for (const offset of offsets) {
      const reminderTime = new Date(event.start.getTime() - offset * 60000);
      const windowEnd = new Date(reminderTime.getTime() + 60000);
      if (now < reminderTime || now >= windowEnd) continue;

      const dateStr = event.start.toISOString().slice(0, 10);
      const key = `notified_${dateStr}_${event.id}_${offset}`;
      const cache = await caches.open("notif-keys");
      if (await cache.match(key)) continue;

      await cache.put(key, new Response("1"));
      const message = buildReminderMessage(event, offset);
      await self.registration.showNotification(message.title, {
        body: message.body,
        icon: "./icons/icon-192.png",
        tag: key,
        vibrate: [200, 100, 200],
      });
    }
  }
}

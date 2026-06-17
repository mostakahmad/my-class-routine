const CACHE_NAME = "cis-routine-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/routine-data.js",
  "./js/scheduler.js",
  "./js/notifications.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/og-image.png",
];

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
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
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
      return fetch(event.request).catch(() => caches.match("./index.html"));
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
});

let reminderInterval = null;

function startReminderLoop() {
  if (reminderInterval) return;
  reminderInterval = setInterval(() => {
    runBackgroundCheck();
  }, 30000);
}

async function runBackgroundCheck() {
  const clients = await self.clients.matchAll({ type: "window" });
  if (clients.length > 0) return;

  const now = new Date();
  const upcoming = [];

  for (let i = 0; i <= 1; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dayIndex = date.getDay();

    if (ROUTINE_SPECIAL_DAYS[dayIndex]) continue;

    const entries = ROUTINE_WEEK[dayIndex] || [];
    entries.forEach((entry) => {
      const slot = ROUTINE_SLOTS[entry.slot];
      const [sh, sm] = slot.start.split(":").map(Number);
      const start = new Date(date);
      start.setHours(sh, sm, 0, 0);

      if (start > now) {
        upcoming.push({
          id: `${dayIndex}_${entry.slot}_${entry.title}`,
          title: entry.title,
          room: entry.room || null,
          slotId: entry.slot,
          start,
          timeRange: `${slot.start} – ${slot.end}`,
        });
      }
    });
  }

  [120, 30].forEach((offset) => {
    upcoming.forEach((event) => {
      const reminderTime = new Date(event.start.getTime() - offset * 60000);
      const windowEnd = new Date(reminderTime.getTime() + 60000);
      const dateStr = event.start.toISOString().slice(0, 10);
      const key = `notified_${dateStr}_${event.id}_${offset}`;

      if (now >= reminderTime && now < windowEnd) {
        caches.open("notif-keys").then(async (cache) => {
          const stored = await cache.match(key);
          if (stored) return;

          await cache.put(key, new Response("1"));
          const roomPart = event.room ? ` — Room ${event.room}` : "";
          const title =
            offset === 120 ? "Class in 2 hours" : "Class in 30 minutes";
          const body =
            offset === 120
              ? `${event.title}${roomPart} starts soon`
              : `${event.title}${roomPart} at ${event.timeRange}`;

          self.registration.showNotification(title, {
            body,
            icon: "./icons/icon-192.png",
            tag: key,
            vibrate: [200, 100, 200],
          });
        });
      }
    });
  });
}

const ROUTINE_SLOTS = {
  s1: { start: "08:30", end: "10:00" },
  s2: { start: "10:00", end: "11:30" },
  s3: { start: "11:30", end: "13:00" },
  s4: { start: "13:00", end: "14:30" },
  s5: { start: "14:30", end: "16:00" },
};

const ROUTINE_SPECIAL_DAYS = { 5: true, 6: true };

const ROUTINE_WEEK = {
  0: [
    { slot: "s2", title: "MIS101" },
    { slot: "s3", title: "COUNSELING HOUR" },
    { slot: "s4", title: "DM 23B", room: "702" },
    { slot: "s5", title: "DM 23A", room: "702" },
  ],
  1: [
    { slot: "s2", title: "COUNSELING HOUR" },
    { slot: "s3", title: "MIS101" },
    { slot: "s5", title: "COUNSELING HOUR" },
  ],
  2: [
    { slot: "s1", title: "MIS101" },
    { slot: "s2", title: "MIS101" },
    { slot: "s3", title: "COUNSELING HOUR" },
    { slot: "s4", title: "DM 23C", room: "702" },
    { slot: "s5", title: "COUNSELING HOUR" },
  ],
  3: [
    { slot: "s2", title: "DM 23C", room: "704" },
    { slot: "s3", title: "DM 23B", room: "704" },
    { slot: "s5", title: "DM 23A", room: "704" },
  ],
  4: [
    { slot: "s2", title: "COUNSELING HOUR" },
    { slot: "s3", title: "COUNSELING HOUR" },
  ],
};

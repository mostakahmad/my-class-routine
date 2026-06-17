let swRegistration = null;

function isNativePlatform() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform());
}

function getPermissionStatus() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    swRegistration = await navigator.serviceWorker.register("./sw.js");
    await navigator.serviceWorker.ready;
    return swRegistration;
  } catch (err) {
    console.warn("Service worker registration failed:", err);
    return null;
  }
}

async function requestPermission() {
  if (isNativePlatform()) {
    return requestNativePermission();
  }

  if (!("Notification" in window)) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    await registerServiceWorker();
  }
  return permission;
}

async function requestNativePermission() {
  try {
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted" ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

async function showNotification(title, options = {}) {
  if (isNativePlatform()) {
    return showNativeNotification(title, options);
  }

  const payload = {
    title,
    body: options.body || "",
    icon: options.icon || "./icons/icon-192.png",
    badge: options.icon || "./icons/icon-192.png",
    tag: options.tag || "cis-routine",
    data: options.data || {},
  };

  if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage({ type: "SHOW_NOTIFICATION", payload });
    return true;
  }

  if (getPermissionStatus() === "granted") {
    new Notification(title, {
      body: payload.body,
      icon: payload.icon,
      tag: payload.tag,
    });
    return true;
  }

  return false;
}

async function showNativeNotification(title, options = {}) {
  try {
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now() % 100000,
          title,
          body: options.body || "",
          schedule: { at: new Date(Date.now() + 500) },
        },
      ],
    });
    return true;
  } catch (err) {
    console.warn("Native notification failed:", err);
    return false;
  }
}

async function scheduleNativeReminders(events) {
  if (!isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );
    await LocalNotifications.cancel({ notifications: [] });

    const notifications = [];
    let id = 1;

    events.forEach((event) => {
      getEnabledReminderOffsets().forEach((offset) => {
        const at = new Date(event.start.getTime() - offset * 60 * 1000);
        if (at <= new Date()) return;

        const msg = buildReminderMessage(event, offset);
        notifications.push({
          id: id++,
          title: msg.title,
          body: msg.body,
          schedule: { at },
        });
      });
    });

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (err) {
    console.warn("Native schedule failed:", err);
  }
}

async function initNotifications() {
  await registerServiceWorker();
  await syncReminderSettingsToSW();

  if (isNativePlatform() && getPermissionStatus() === "granted") {
    const events = getUpcomingEvents(14);
    await scheduleNativeReminders(events);
  }
}

function getNotificationBadgeClass(status) {
  switch (status) {
    case "granted":
      return "badge-enabled";
    case "denied":
      return "badge-blocked";
    default:
      return "badge-pending";
  }
}

function getNotificationBadgeText(status) {
  switch (status) {
    case "granted":
      return "Reminders enabled";
    case "denied":
      return "Blocked — enable in browser settings";
    case "unsupported":
      return "Not supported on this device";
    default:
      return "Not enabled";
  }
}

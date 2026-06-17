import {
  isNativePlatform,
  checkNativePermission,
  requestNativePermission,
  showNativeNotification,
  cancelAllNativeNotifications,
  scheduleNativeNotifications,
} from "./native-notifications.js";
import { getEnabledReminderOffsets, syncReminderSettingsToSW } from "./reminder-settings.js";
import { getUpcomingEvents, buildReminderMessage } from "./scheduler.js";

export { isNativePlatform };

let swRegistration = null;
let nativePermission = "default";

export async function getPermissionStatus() {
  if (isNativePlatform()) {
    if (nativePermission === "default") {
      nativePermission = await checkNativePermission();
    }
    return nativePermission;
  }
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function registerServiceWorker() {
  if (isNativePlatform() || !("serviceWorker" in navigator)) return null;

  try {
    swRegistration = await navigator.serviceWorker.register("./sw.js");
    await navigator.serviceWorker.ready;
    return swRegistration;
  } catch (err) {
    console.warn("Service worker registration failed:", err);
    return null;
  }
}

export async function requestPermission() {
  if (isNativePlatform()) {
    nativePermission = await requestNativePermission();
    return nativePermission;
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

export async function showNotification(title, options = {}) {
  if (isNativePlatform()) {
    return showNativeNotification(title, options.body, options.tag);
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

  if (Notification.permission === "granted") {
    new Notification(title, {
      body: payload.body,
      icon: payload.icon,
      tag: payload.tag,
    });
    return true;
  }

  return false;
}

export async function scheduleNativeReminders(events) {
  if (!isNativePlatform()) return;

  try {
    await cancelAllNativeNotifications();

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

    await scheduleNativeNotifications(notifications);
  } catch (err) {
    console.warn("Native schedule failed:", err);
  }
}

export async function initNotifications() {
  if (!isNativePlatform()) {
    await registerServiceWorker();
    await syncReminderSettingsToSW();
  }

  if (isNativePlatform() && (await getPermissionStatus()) === "granted") {
    const events = getUpcomingEvents(14);
    await scheduleNativeReminders(events);
  }
}

export function getNotificationBadgeClass(status) {
  switch (status) {
    case "granted":
      return "badge-enabled";
    case "denied":
      return "badge-blocked";
    default:
      return "badge-pending";
  }
}

export function getNotificationBadgeText(status) {
  switch (status) {
    case "granted":
      return "Reminders enabled";
    case "denied":
      return isNativePlatform()
        ? "Blocked — enable in phone settings"
        : "Blocked — enable in browser settings";
    case "unsupported":
      return "Not supported on this device";
    default:
      return "Not enabled";
  }
}

export async function refreshNativePermission() {
  if (isNativePlatform()) {
    nativePermission = await checkNativePermission();
  }
  return getPermissionStatus();
}

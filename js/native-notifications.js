import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export async function checkNativePermission() {
  const result = await LocalNotifications.checkPermissions();
  if (result.display === "granted") return "granted";
  if (result.display === "denied") return "denied";
  return "default";
}

export async function requestNativePermission() {
  const result = await LocalNotifications.requestPermissions();
  if (result.display === "granted") return "granted";
  if (result.display === "denied") return "denied";
  return "default";
}

export async function showNativeNotification(title, body, tag) {
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now() % 100000,
        title,
        body: body || "",
        schedule: { at: new Date(Date.now() + 500) },
        extra: { tag: tag || "cis-routine" },
      },
    ],
  });
  return true;
}

export async function cancelAllNativeNotifications() {
  const pending = await LocalNotifications.getPending();
  if (pending.notifications?.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
}

export async function scheduleNativeNotifications(notifications) {
  if (!notifications.length) return;
  await LocalNotifications.schedule({ notifications });
}

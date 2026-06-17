import { BROADCAST_CONFIG } from "./broadcast-config.js";
import { getPermissionStatus, showNotification } from "./notifications.js";

const DEVICE_ID_KEY = "cis_device_id";
const LAST_BROADCAST_KEY = "cis_last_broadcast_id";

let broadcastDb = null;
let broadcastUnsubscribe = null;

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function isBroadcastConfigured() {
  return (
    BROADCAST_CONFIG.enabled &&
    BROADCAST_CONFIG.firebase?.projectId &&
    BROADCAST_CONFIG.firebase?.apiKey
  );
}

export function initBroadcast() {
  if (!isBroadcastConfigured() || typeof firebase === "undefined") return false;

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(BROADCAST_CONFIG.firebase);
    }
    broadcastDb = firebase.firestore();
    registerSubscriber();
    startBroadcastListener();
    return true;
  } catch (err) {
    console.warn("Broadcast init failed:", err);
    return false;
  }
}

async function registerSubscriber() {
  if (!broadcastDb) return;

  const deviceId = getDeviceId();
  const ref = broadcastDb
    .collection(BROADCAST_CONFIG.subscribersCollection)
    .doc(deviceId);

  await ref.set(
    {
      deviceId,
      subscribed: true,
      userAgent: navigator.userAgent.slice(0, 120),
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

function startBroadcastListener() {
  if (!broadcastDb || broadcastUnsubscribe) return;

  const docRef = broadcastDb
    .collection(BROADCAST_CONFIG.broadcastsCollection)
    .doc(BROADCAST_CONFIG.broadcastDoc);

  broadcastUnsubscribe = docRef.onSnapshot((snap) => {
    if (!snap.exists) return;

    const data = snap.data();
    const lastId = localStorage.getItem(LAST_BROADCAST_KEY);

    if (!data.id || data.id === lastId) return;

    getPermissionStatus().then((status) => {
      if (status !== "granted") return;

      localStorage.setItem(LAST_BROADCAST_KEY, data.id);
      showNotification(data.title || "CIS Announcement", {
        body: data.message || "",
        tag: `broadcast-${data.id}`,
      });
    });
  });
}

export async function sendBroadcast(message, pin) {
  const text = (message || "").trim();
  if (!text) return { ok: false, error: "Enter a message" };
  if (pin !== BROADCAST_CONFIG.adminPin) return { ok: false, error: "Wrong admin PIN" };

  const payload = {
    id: `${Date.now()}_${getDeviceId().slice(0, 8)}`,
    title: "CIS Announcement",
    message: text,
  };

  if (isBroadcastConfigured() && broadcastDb) {
    await broadcastDb
      .collection(BROADCAST_CONFIG.broadcastsCollection)
      .doc(BROADCAST_CONFIG.broadcastDoc)
      .set({
        id: payload.id,
        title: payload.title,
        message: text,
        sentAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    localStorage.setItem(LAST_BROADCAST_KEY, payload.id);
    return { ok: true, mode: "firebase" };
  }

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "LOCAL_BROADCAST",
      payload: { title: payload.title, body: text, tag: payload.id },
    });
  }

  await showNotification(payload.title, { body: text, tag: payload.id });
  return {
    ok: true,
    mode: "local",
    warning: "Firebase not configured — only this device notified",
  };
}

export async function getSubscriberCount() {
  if (!broadcastDb) return null;

  try {
    const snap = await broadcastDb
      .collection(BROADCAST_CONFIG.subscribersCollection)
      .where("subscribed", "==", true)
      .get();
    return snap.size;
  } catch {
    return null;
  }
}

export function getBroadcastStatusText() {
  if (isBroadcastConfigured()) {
    return getPermissionStatus().then((status) =>
      status === "granted"
        ? "Connected — listening for announcements"
        : "Enable reminders to receive broadcasts"
    );
  }
  return Promise.resolve("Local mode — configure Firebase for all devices");
}

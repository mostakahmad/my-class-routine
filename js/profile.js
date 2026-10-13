const PROFILE_KEY = "active_profile";

export function getActiveProfile() {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved === "mostak" || saved === "sonia") return saved;
  } catch {
    /* private mode */
  }
  return "sonia";
}

export function setActiveProfile(profile) {
  const next = profile === "mostak" ? "mostak" : "sonia";
  try {
    localStorage.setItem(PROFILE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export async function syncProfileToSW(profile = getActiveProfile()) {
  try {
    const cache = await caches.open("cis-app-settings");
    await cache.put(
      "active-profile",
      new Response(profile, { headers: { "Content-Type": "text/plain" } })
    );
  } catch {
    /* cache unavailable on native */
  }

  if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SYNC_ACTIVE_PROFILE",
      profile,
    });
  }
}

export function applyProfileChrome(profile, labels) {
  document.body.dataset.profile = profile;

  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.hidden = el.dataset.nav !== profile;
  });

  const title = document.getElementById("dept-title");
  const term = document.getElementById("term-label");
  const glyph = document.getElementById("brand-icon-glyph");
  if (title) title.textContent = labels.title;
  if (term) term.textContent = labels.term;
  if (glyph) {
    glyph.className = `bi ${profile === "mostak" ? "bi-bullseye" : "bi-mortarboard-fill"}`;
  }

  document.querySelectorAll("#profile-menu [data-profile]").forEach((btn) => {
    const active = btn.dataset.profile === profile;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
}

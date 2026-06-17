# CIS Class Routine Reminder

A simple static web app for the **Department of CIS — Summer 2026** class routine. Shows live tracking of your current/next class and sends reminders **2 hours** and **30 minutes** before each slot.

## Features

- Live "Now" and "Next Class" tracking with countdown
- Today's schedule with active slot highlight
- Full weekly routine table
- Browser/PWA notifications (2h and 30min before class)
- Offline support via Service Worker
- Ready for GitHub Pages and future Capacitor APK build

## Quick Start (Local)

Open `index.html` in a browser, or serve locally:

```bash
cd my-routine
python3 -m http.server 8080
```

Visit `http://localhost:8080` and click **Enable Reminders**.

> Notifications require HTTPS or `localhost`. Use a local server — do not open the file directly (`file://`).

## Enable Mobile Notifications

### Android (Chrome)

1. Open the app URL
2. Tap **Enable Reminders** and allow notifications
3. Optional: Menu → **Add to Home screen** (install as PWA for better background alerts)

### Desktop

1. Open the app
2. Click **Enable Reminders**
3. Allow notifications when prompted

## GitHub Pages Deploy

1. Create a GitHub repository and push this folder
2. Go to **Settings → Pages**
3. Source: `main` branch, `/ (root)` folder
4. Your app will be at `https://<username>.github.io/<repo-name>/`

After deploy, open on mobile and install to home screen for best reminder reliability.

## Capacitor APK (Later)

When building a native Android app:

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/local-notifications
npx cap init "CIS Routine" com.cis.routine --web-dir .
npx cap add android
npx cap sync
npx cap open android
```

`notifications.js` already includes a Capacitor stub — native local notifications will work once the plugin is installed.

## Edit Routine

Update schedule data in [`js/routine-data.js`](js/routine-data.js). If you change the routine, also update the duplicate data in [`sw.js`](sw.js) (used for background reminders when the app is closed).

## Reminder Slots

All scheduled slots trigger reminders: MIS101, DM classes, and Counseling Hour.  
Friday = Holiday, Saturday = Day Off (no reminders).

Uses your **device local timezone** automatically.
# my-class-routine

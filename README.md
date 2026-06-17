# CIS Class Routine Reminder

Department of CIS — **Summer 2026** class routine with live tracking, configurable reminders, and Firebase broadcast.

## Features

- Live "Now" and "Next Class" tracking with countdown
- Weekly routine + today's timeline
- Configurable reminders: 2h, 1h, 30m, 15m + custom minutes
- Broadcast messages to subscribed devices (Firebase)
- **Web/PWA** (GitHub Pages) + **Android APK** (Capacitor)

---

## Web (GitHub Pages)

Live: [mostakahmad.github.io/my-class-routine](https://mostakahmad.github.io/my-class-routine/)

For local dev with ES modules:

```bash
npm install          # run on ext4 (home folder), not FAT USB drives
npm run build
python3 -m http.server 8080 --directory www
```

> GitHub Pages can deploy the `www/` folder after `npm run build`, or continue using root files with a build step in CI.

---

## Android App (Capacitor)

### Prerequisites

- Node.js 20+
- Java JDK 17
- [Android Studio](https://developer.android.com/studio) (SDK 34+)

> **Important:** Run `npm install` on an **ext4** disk (e.g. `~/projects`). USB/FAT drives cannot run npm/esbuild due to symlink and executable limits.

### Quick build script

```bash
bash scripts/android-build.sh
```

This copies the project to `/tmp`, installs deps, builds `www/`, syncs Capacitor, and copies `android/` back.

### Manual steps

```bash
# On ext4 filesystem (home directory recommended)
npm install
npm run build
npx cap sync android
npx cap open android
```

In Android Studio:

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)** → debug APK for students
2. **Build → Generate Signed Bundle / APK** → **AAB** for Google Play Store

Debug APK path:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### App ID

`com.cis.myroutine` — do not change after Play Store upload.

### Native notifications

- Class reminders use **LocalNotifications** (system alarm, works when app is closed)
- Open app once after install → Settings → Enable Reminders
- Broadcast uses Firebase Firestore (works when app is open/background)

---

## Google Play Store (later)

1. [Google Play Console](https://play.google.com/console) — $25 one-time fee
2. Build signed **AAB** (not APK)
3. Upload: app icon 512×512, screenshots, privacy policy URL
4. Roll out: Internal testing → Production

Keep your **keystore file safe** — losing it prevents app updates.

---

## Firebase broadcast

Config: [`js/broadcast-config.js`](js/broadcast-config.js)

Students: enable reminders → auto-subscribed.  
Teacher: Settings → Broadcast message + admin PIN.

---

## Edit routine

Update [`js/routine-data.js`](js/routine-data.js) and the duplicate data in [`sw.js`](sw.js) (web background reminders).

After changes:

```bash
npm run build
npx cap sync android
```

---

## Project structure

```
my-routine/
├── index.html          # source UI
├── js/                 # ES module source
├── www/                # built web assets (Capacitor + deploy)
├── android/            # Capacitor Android project
├── capacitor.config.json
├── package.json
└── scripts/
    ├── build-www.js    # esbuild → www/
    └── android-build.sh
```

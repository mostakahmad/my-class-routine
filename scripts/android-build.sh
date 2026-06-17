#!/usr/bin/env bash
# Build CIS Routine Android app (run from ext4 filesystem — not FAT USB drives)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="${TMPDIR:-/tmp}/cis-routine-build-$$"

echo "Copying project to $BUILD_DIR ..."
rm -rf "$BUILD_DIR"
cp -r "$ROOT" "$BUILD_DIR"
cd "$BUILD_DIR"

echo "Installing dependencies ..."
npm install

echo "Building web assets ..."
npm run build

echo "Syncing Capacitor Android ..."
npx cap sync android

echo "Copying android/ and www/ back to project ..."
cp -r android www package-lock.json "$ROOT/"

echo "Done. Open Android Studio:"
echo "  cd \"$ROOT\" && npx cap open android"
echo "Or build debug APK:"
echo "  cd \"$ROOT/android\" && ./gradlew assembleDebug"

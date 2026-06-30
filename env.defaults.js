/**
 * Single source of truth for mobile app env defaults.
 * Change the backend URL here before local runs or EAS builds.
 *
 * Physical device (Expo Go / APK on same Wi‑Fi): use your Mac's LAN IP.
 *   Find IP: ipconfig getifaddr en0
 * Android emulator: env.ts auto-rewrites LAN IP → http://10.0.2.2:PORT
 * iOS Simulator: env.ts auto-rewrites LAN IP → http://localhost:PORT
 * Production / EAS builds: set API_BASE_URL here before `eas build`, or use
 *   EXPO_PUBLIC_API_BASE_URL in eas.json — baked into the APK/IPA at build time.
 * Expo Go dev: changing this file + reload is enough (env.defaults wins in __DEV__).
 *   Restart Metro with `npm run start:clear` if the URL still looks stale.
 *  server url is https://pharmaerpbackend.onrender.com
 */
module.exports = {
  API_BASE_URL: 'http://192.168.100.87:5001',
};

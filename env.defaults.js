/**
 * Single source of truth for mobile app env defaults.
 * Change the backend URL here before local runs or EAS builds.
 *
 * Local dev (phone + Expo Go): use your Mac's LAN IP, same Wi‑Fi as the phone.
 *   Find IP: ipconfig getifaddr en0
 * Production / EAS builds: use https://pharmaerpbackend.onrender.com
 */
module.exports = {
  API_BASE_URL: 'http://192.168.100.247:5001',
};

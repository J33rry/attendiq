// Central API configuration.
// By default the browser calls the same-origin /api prefix, which next.config.mjs proxies
// to the Express backend (API_URL). Set NEXT_PUBLIC_API_BASE only if you serve the API
// from somewhere else and have configured CORS + cookies for it.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

// How far above the requirement still counts as "close to the line" (percentage points).
// The requirement itself always comes from the backend.
export const WARNING_MARGIN = 5;

// The RFID scanner accepts cards this many minutes before a session starts
// (mirrors GRACE_MS in backend/src/routes/device.js).
export const RFID_GRACE_MINUTES = 10;

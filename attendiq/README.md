# AttendIQ

RFID-based attendance system: **Next.js** frontend, **Express** API, **Neon Postgres + Drizzle**, **ESP32 + RC522** reader.

```
attendiq/
  backend/    Express API, Drizzle schema (src/schema.js), migrations (drizzle/), tests
  frontend/   Next.js app (student + faculty UIs, proxies /api to the backend)
  firmware/   ESP32 sketch
```

## Setup
1. Create a Neon project and copy its connection string.
2. Backend:
   ```bash
   cd backend && cp .env.example .env   # fill DATABASE_URL and DEVICE_API_KEY
   npm install
   npm run db:push        # or apply drizzle/*.sql
   npm run seed           # demo data (WIPES users/holidays tables)
   npm run dev            # http://localhost:4000
   ```
3. Frontend: `cd frontend && npm install && npm run dev` (http://localhost:3000; set `API_URL` if the API isn't on :4000).
4. Firmware: edit the constants in `firmware/attendiq_esp32/attendiq_esp32.ino`; `SERVER_URL` must be reachable from the ESP32 (deploy the API or use your LAN IP), `DEVICE_KEY` = `DEVICE_API_KEY`.

Demo logins (password `password123`): `faculty@attendiq.dev`, `21cs001@attendiq.dev` … `21cs004@attendiq.dev`. Demo card UIDs are in `backend/src/seed.js`; register real cards by updating `students.rfid_uid`.

## Frontend
Next.js (App Router, JavaScript) + Tailwind CSS v4. The browser calls `/api/*` on the Next origin and `next.config.mjs` proxies to `API_URL` (default `http://localhost:4000`), so the backend's httpOnly session cookie stays first-party; nothing auth-related is stored in the browser.

```
frontend/
  app/            routes: /login, /student/*, /faculty/*
  components/ui   design system (buttons, cards, progress ring, modal, toasts, icons, logo)
  components/     Shell (sidebar + mobile nav), auth (AuthProvider, RoleGate), student/, faculty/, illustrations/
  lib/            api.js (all endpoints), config.js (API base, warning margin), format.js, status.js, hooks.js
```
- The attendance requirement is read from the planner endpoints (`threshold`); the "close to the line" band is that value + `WARNING_MARGIN` (lib/config.js).
- Role checks in the UI only route users; the backend's `requireRole` is the real guard.
- Any 401 sends the user to `/login?expired=1`.

## Tests
`cd backend && npm test` runs the API suite against in-process Postgres (PGlite), no Neon needed.

## Rules implemented
- **Conducted** = non-cancelled sessions whose start time has passed; a conducted session without a "present" record counts as absent.
- Bunk: safe skips = floor(attended/0.75 − conducted). Recovery: ceil((0.75·conducted − attended)/0.25).
- RFID scan (`POST /api/device/scan`, header `x-device-key`): finds the student's currently running session (10 min grace before start), rejects unregistered cards, cancelled/out-of-window sessions and duplicates (unique `(session_id, student_id)`).
- Holidays cancel all sessions on that date; cancelled sessions reject attendance and are excluded from percentages.
- Assistant is rule-based (`services/assistantService.js`); `answer()` is the seam for an external LLM.

## Notes
- Sessions are server-side (random token in an httpOnly cookie, SHA-256 hashed in `auth_sessions`, 12h). Set `NODE_ENV=production` over HTTPS for secure cookies.
- Times are stored/compared in UTC; the UI displays local time. "Today" on the faculty dashboard uses the UTC day.
- The earlier prototype in `../rfid-backend` and `../ESP32_RFID` is untouched.

const d = (v) => (v instanceof Date ? v : new Date(v));

export const fmtDate = (v) => d(v).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
export const fmtLongDate = (v) => d(v).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const fmtTime = (v) => d(v).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export const fmtDateTime = (v) => `${fmtDate(v)}, ${fmtTime(v)}`;
export const fmtRange = (a, b) => `${fmtTime(a)} – ${fmtTime(b)}`;
export const fmtPct = (n) => `${Number.isInteger(n) ? n : Number(n).toFixed(1)}%`;

export const firstName = (name = "") => {
  const parts = name.trim().split(/\s+/);
  // Keep titles like "Dr." with the next word: "Dr. Meera"
  if (/^(dr|prof|mr|ms|mrs)\.?$/i.test(parts[0]) && parts[1]) return `${parts[0]} ${parts[1]}`;
  return parts[0] || "there";
};

export const initials = (name = "") =>
  name.replace(/^(dr|prof)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Hello";
}

export const sameDay = (a, b) => d(a).toDateString() === d(b).toDateString();

export function dayLabel(v, now = new Date()) {
  const t = new Date(now); t.setHours(0, 0, 0, 0);
  const x = new Date(d(v)); x.setHours(0, 0, 0, 0);
  const diff = Math.round((x - t) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return fmtDate(v);
}

export function relative(v, now = new Date()) {
  const s = Math.round((d(v) - now) / 1000);
  const abs = Math.abs(s);
  const rtf = new Intl.RelativeTimeFormat([], { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(s), "second");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

/** yyyy-mm-dd in the user's local timezone */
export const localDateKey = (v) => {
  const x = d(v);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
export const localTimeKey = (v) => {
  const x = d(v);
  return `${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
};
/** Combine local date + time inputs into an ISO string for the API. */
export const toISO = (date, time) => new Date(`${date}T${time}`).toISOString();

export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

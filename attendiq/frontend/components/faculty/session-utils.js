"use client";
import { Badge } from "@/components/ui/primitives";
import { RFID_GRACE_MINUTES } from "@/lib/config";

/** Display phase of a session, from its stored status plus the clock. */
export function phaseOf(s, now = new Date()) {
  if (s.status === "cancelled") return "cancelled";
  const start = new Date(s.startsAt), end = new Date(s.endsAt);
  if (now >= start && now <= end) return "live";
  if (now < start) return now >= new Date(start.getTime() - RFID_GRACE_MINUTES * 60_000) ? "opening" : "upcoming";
  return s.status === "conducted" ? "done" : "unmarked";
}

/** True while the RFID reader would accept a tap for this session (backend rule). */
export const scannerOpen = (s, now = new Date()) =>
  s.status !== "cancelled" &&
  now >= new Date(new Date(s.startsAt).getTime() - RFID_GRACE_MINUTES * 60_000) &&
  now <= new Date(s.endsAt);

const PHASE = {
  live: { tone: "sage", label: "In progress", dot: true },
  opening: { tone: "sky", label: "Starting soon", dot: true },
  upcoming: { tone: "sky", label: "Scheduled" },
  done: { tone: "ink", label: "Conducted" },
  unmarked: { tone: "butter", label: "Needs attendance" },
  cancelled: { tone: "coral", label: "Cancelled" },
};

export function SessionBadge({ s, now }) {
  const p = PHASE[phaseOf(s, now)];
  return <Badge tone={p.tone} dot={p.dot}>{p.label}</Badge>;
}

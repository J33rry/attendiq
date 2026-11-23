import { WARNING_MARGIN } from "./config";

/**
 * Visual band for an attendance figure.
 * `eligible` comes straight from the backend; `threshold` is the backend's requirement.
 * The "close" band is purely presentational: eligible, but within WARNING_MARGIN points.
 */
export function bandFor({ percentage, eligible, threshold, conducted }) {
  if (conducted === 0) return "fresh";
  if (eligible === false) return "low";
  if (threshold != null && percentage < threshold + WARNING_MARGIN) return "close";
  return "good";
}

export const BAND = {
  good: {
    label: "On track",
    tone: "sage",
    note: "Nicely done — keep this rhythm going.",
  },
  close: {
    label: "Close to the line",
    tone: "butter",
    note: "You're above the requirement, with only a little room to spare.",
  },
  low: {
    label: "Needs attention",
    tone: "coral",
    note: "A few steady weeks of classes will bring this back up.",
  },
  fresh: {
    label: "No classes yet",
    tone: "sky",
    note: "Nothing has been conducted yet — a clean slate.",
  },
};

/** Tailwind classes per tone, so colour stays consistent across components. */
export const TONE = {
  sage: { text: "text-sage-700", bg: "bg-sage-50", fill: "bg-sage-500", stroke: "var(--color-sage-500)", ring: "ring-sage-200" },
  butter: { text: "text-butter-700", bg: "bg-butter-50", fill: "bg-butter-400", stroke: "var(--color-butter-400)", ring: "ring-butter-200" },
  coral: { text: "text-coral-700", bg: "bg-coral-50", fill: "bg-coral-400", stroke: "var(--color-coral-400)", ring: "ring-coral-200" },
  sky: { text: "text-sky-700", bg: "bg-sky-50", fill: "bg-sky-400", stroke: "var(--color-sky-400)", ring: "ring-sky-200" },
  lavender: { text: "text-lavender-700", bg: "bg-lavender-50", fill: "bg-lavender-400", stroke: "var(--color-lavender-400)", ring: "ring-lavender-200" },
  ink: { text: "text-ink-700", bg: "bg-paper-100", fill: "bg-ink-500", stroke: "var(--color-ink-500)", ring: "ring-paper-300" },
};

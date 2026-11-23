"use client";
import { useEffect, useState } from "react";
import { TONE } from "@/lib/status";

/**
 * Animated circular attendance meter. Optional `marker` draws a small tick at the
 * requirement so students can see the distance to it at a glance.
 */
export default function ProgressRing({ value = 0, size = 180, stroke = 14, tone = "sage", marker, children, label }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const t = TONE[tone];
  const markerAngle = marker != null ? (marker / 100) * 360 - 90 : null;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label || `${value}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-paper-200)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.stroke} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      {markerAngle != null && (
        <span
          className="absolute left-1/2 top-1/2 h-[3px] rounded-full bg-ink-700"
          style={{
            width: stroke + 8,
            transform: `translate(-50%, -50%) rotate(${markerAngle}deg) translateX(${r}px)`,
          }}
          title={`Requirement: ${marker}%`}
        />
      )}
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

// Small hand-drawn-feel classroom scenes. Flat shapes, soft palette, slightly imperfect lines.

/** Chalkboard with a ticked list, a desk lamp of a sun, and a stack of books. */
export function ChalkboardScene({ className = "", message = "Present!" }) {
  return (
    <svg viewBox="0 0 260 180" className={className} aria-hidden>
      {/* wall shadow */}
      <ellipse cx="135" cy="168" rx="110" ry="8" fill="var(--color-paper-300)" opacity=".6" />
      {/* board frame */}
      <rect x="28" y="18" width="180" height="112" rx="10" fill="#b98d5f" />
      <rect x="36" y="26" width="164" height="96" rx="6" fill="var(--color-sage-700)" />
      {/* chalk text */}
      <g stroke="#f3efe3" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity=".92">
        <path d="m52 48 5 5 9-10" />
        <path d="M76 48h48" />
        <path d="m52 70 5 5 9-10" />
        <path d="M76 70h62" />
        <path d="m52 92 5 5 9-10" />
        <path d="M76 92h36" />
        <path d="M150 50c8-8 22-8 30 0" opacity=".6" />
      </g>
      <text x="148" y="104" fill="var(--color-butter-200)" fontFamily="var(--font-hand)" fontSize="19" transform="rotate(-6 160 100)">{message}</text>
      {/* chalk tray */}
      <rect x="40" y="128" width="156" height="6" rx="3" fill="#a07a50" />
      <rect x="60" y="124" width="14" height="4" rx="2" fill="#fdfbf6" />
      <rect x="80" y="124" width="9" height="4" rx="2" fill="var(--color-butter-300)" />
      {/* books */}
      <g transform="translate(196 116)">
        <rect x="0" y="34" width="52" height="12" rx="3" fill="var(--color-lavender-400)" />
        <rect x="4" y="22" width="46" height="12" rx="3" fill="var(--color-sky-400)" />
        <rect x="-2" y="10" width="50" height="12" rx="3" fill="var(--color-butter-300)" />
        <path d="M8 16h20M10 28h18M6 40h24" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7" />
        {/* apple */}
        <circle cx="26" cy="2" r="8" fill="var(--color-coral-400)" />
        <path d="M26-6c1-4 4-5 6-5" stroke="var(--color-sage-600)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      {/* pencil */}
      <g transform="rotate(-24 20 150)">
        <rect x="6" y="146" width="40" height="8" rx="2" fill="var(--color-butter-400)" />
        <path d="M46 146l10 4-10 4z" fill="#e9d2b0" />
        <rect x="2" y="146" width="6" height="8" rx="2" fill="var(--color-coral-200)" />
      </g>
    </svg>
  );
}

/** Desk with an open register and an RFID reader — for the faculty welcome. */
export function DeskScene({ className = "" }) {
  return (
    <svg viewBox="0 0 260 170" className={className} aria-hidden>
      <ellipse cx="130" cy="160" rx="112" ry="8" fill="var(--color-paper-300)" opacity=".6" />
      <rect x="18" y="112" width="224" height="12" rx="6" fill="#c79c6c" />
      <rect x="36" y="124" width="10" height="34" rx="3" fill="#b38759" />
      <rect x="214" y="124" width="10" height="34" rx="3" fill="#b38759" />
      {/* open register */}
      <g transform="translate(42 58)">
        <path d="M0 52 6 4c22-6 42-2 54 6v48C48 50 26 48 0 52Z" fill="#fdfbf6" stroke="var(--color-paper-400)" strokeWidth="1.5" />
        <path d="M120 52 114 4C92-2 72 2 60 10v48c12-8 34-10 60-6Z" fill="#fdfbf6" stroke="var(--color-paper-400)" strokeWidth="1.5" />
        <g stroke="var(--color-sky-200)" strokeWidth="1.5"><path d="M14 18h36M14 28h36M14 38h30M72 18h34M72 28h34M72 38h26" /></g>
        <g stroke="var(--color-sage-600)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="m40 16 3 3 6-6M40 26l3 3 6-6M98 16l3 3 6-6" />
        </g>
      </g>
      {/* RFID reader */}
      <g transform="translate(176 64)">
        <rect x="0" y="0" width="44" height="48" rx="8" fill="var(--color-ink-700)" />
        <rect x="6" y="6" width="32" height="20" rx="4" fill="var(--color-sage-300)" />
        <circle cx="22" cy="37" r="5" fill="var(--color-butter-300)" />
        <g stroke="var(--color-sky-400)" strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M50 14a12 12 0 0 1 0 18" /><path d="M56 8a20 20 0 0 1 0 30" opacity=".6" />
        </g>
      </g>
      {/* mug */}
      <g transform="translate(16 82)">
        <rect x="0" y="6" width="22" height="24" rx="5" fill="var(--color-lavender-400)" />
        <path d="M22 12h4a5 5 0 0 1 0 10h-4" stroke="var(--color-lavender-400)" strokeWidth="3.5" fill="none" />
        <path d="M7 0c-2 2 2 3 0 5M14 0c-2 2 2 3 0 5" stroke="var(--color-ink-300)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Tiny doodles used for decoration (e.g., near headings) */
export const Squiggle = ({ className = "" }) => (
  <svg viewBox="0 0 120 12" className={className} aria-hidden preserveAspectRatio="none">
    <path d="M2 7c10-6 18 4 28 0s18-6 28 0 18 4 28 0 18-6 32 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const PaperPlane = ({ className = "" }) => (
  <svg viewBox="0 0 64 48" className={className} aria-hidden>
    <path d="M2 22 60 2 42 44 30 28Z" fill="#fdfbf6" stroke="var(--color-ink-400)" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M30 28 60 2" stroke="var(--color-ink-400)" strokeWidth="1.8" />
    <path d="M2 40c6-2 10-6 14-10" stroke="var(--color-ink-300)" strokeWidth="1.6" strokeDasharray="3 4" fill="none" strokeLinecap="round" />
  </svg>
);

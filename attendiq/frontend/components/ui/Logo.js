/** AttendIQ mark: a spiral-bound notebook page with a chalk-green checkmark. */
export function LogoMark({ size = 36, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="10" y="6" width="46" height="52" rx="12" fill="var(--color-sage-500)" />
      <rect x="16" y="6" width="40" height="52" rx="10" fill="var(--color-paper-50)" />
      <path d="M22 20h26M22 46h18" stroke="var(--color-sky-200)" strokeWidth="2" strokeLinecap="round" />
      <g fill="var(--color-ink-900)">
        <circle cx="13" cy="18" r="3" /><circle cx="13" cy="32" r="3" /><circle cx="13" cy="46" r="3" />
      </g>
      <path d="M25 33.5l7 7 13-15" fill="none" stroke="var(--color-sage-600)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ size = 34, className = "", tagline = false }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="leading-none">
        <span className="font-display text-[1.35rem] font-semibold tracking-tight text-ink-900">
          Attend<span className="text-sage-600">IQ</span>
        </span>
        {tagline && <span className="mt-1 block text-xs text-ink-400">Your Campus. Your Classes. Your Progress.</span>}
      </span>
    </span>
  );
}

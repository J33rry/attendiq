"use client";
import Link from "next/link";
import Icon from "./Icon";
import { TONE } from "@/lib/status";

const cx = (...c) => c.filter(Boolean).join(" ");
export { cx };

/* ── Buttons ─────────────────────────────────────────────── */
const BTN = {
  primary: "bg-ink-900 text-paper-50 hover:bg-ink-700 shadow-soft",
  sage: "bg-sage-600 text-white hover:bg-sage-700 shadow-soft",
  secondary: "bg-white text-ink-900 ring-1 ring-paper-300 hover:ring-ink-300 hover:bg-paper-50",
  ghost: "text-ink-700 hover:bg-paper-200/70",
  danger: "bg-coral-700 text-white hover:bg-coral-700/90 shadow-soft",
  dangerGhost: "text-coral-700 hover:bg-coral-50 ring-1 ring-coral-200",
};
const SIZE = { sm: "h-9 px-3 text-sm gap-1.5", md: "h-11 px-4 text-[0.95rem] gap-2", lg: "h-12 px-5 text-base gap-2" };

export function Button({ variant = "primary", size = "md", icon, iconRight, loading, className, children, href, ...rest }) {
  const cls = cx(
    "inline-flex select-none items-center justify-center rounded-[var(--radius-control)] font-semibold transition",
    "active:translate-y-px disabled:opacity-50 disabled:active:translate-y-0",
    BTN[variant], SIZE[size], className,
  );
  const inner = (
    <>
      {loading ? <Spinner /> : icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 16 : 18} />}
    </>
  );
  if (href) return <Link href={href} className={cls} {...rest}>{inner}</Link>;
  return <button className={cls} {...rest} disabled={loading || rest.disabled} aria-busy={loading || undefined}>{inner}</button>;
}

export function IconButton({ icon, label, className, ...rest }) {
  return (
    <button aria-label={label} title={label} className={cx("grid size-10 place-items-center rounded-full text-ink-500 transition hover:bg-paper-200 hover:text-ink-900", className)} {...rest}>
      <Icon name={icon} />
    </button>
  );
}

export const Spinner = ({ className = "size-4" }) => (
  <span className={cx("inline-block animate-spin rounded-full border-2 border-current border-r-transparent", className)} role="status" aria-label="Loading" />
);

/* ── Surfaces ────────────────────────────────────────────── */
export function Card({ className, children, as: As = "div", interactive, ...rest }) {
  return (
    <As
      className={cx(
        "rounded-[var(--radius-card)] bg-white ring-1 ring-paper-300/70 shadow-soft",
        interactive && "transition duration-200 hover:-translate-y-0.5 hover:shadow-lift hover:ring-paper-400",
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

export function Section({ title, hand, action, children, className }) {
  return (
    <section className={cx("animate-rise", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {hand && <p className="font-hand text-lg leading-tight text-ink-400">{hand}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, hand, action, back }) {
  return (
    <header className="mb-6 flex flex-col gap-4 animate-rise sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-ink-400 hover:text-ink-900">
            <Icon name="chevronLeft" size={16} /> {back.label}
          </Link>
        )}
        {hand && <p className="font-hand text-xl leading-none text-sage-600">{hand}</p>}
        <h1 className="text-[1.9rem] font-semibold leading-tight sm:text-[2.2rem]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </header>
  );
}

/* ── Badges / pills ──────────────────────────────────────── */
export function Badge({ tone = "ink", children, className, dot }) {
  const t = TONE[tone];
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", t.bg, t.text, className)}>
      {dot && <span className={cx("size-1.5 rounded-full", t.fill)} />}
      {children}
    </span>
  );
}

/* ── Progress ────────────────────────────────────────────── */
export function ProgressBar({ value, tone = "sage", marker, className, size = "md" }) {
  const t = TONE[tone];
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className={cx("relative w-full rounded-full bg-paper-200", size === "sm" ? "h-1.5" : "h-2.5", className)}
      role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-[width] duration-1000 ease-out", t.fill)} style={{ width: `${v}%` }} />
      {marker != null && (
        <span className="absolute -top-1 bottom-[-4px] w-0.5 rounded bg-ink-700/60" style={{ left: `${marker}%` }} title={`Requirement: ${marker}%`} />
      )}
    </div>
  );
}

/* ── States ──────────────────────────────────────────────── */
export function Skeleton({ className }) { return <div className={cx("skeleton", className)} />; }

export function EmptyState({ icon = "book", title, children, action, className }) {
  return (
    <div className={cx("flex flex-col items-center rounded-[var(--radius-card)] border-2 border-dashed border-paper-300 bg-paper-50 px-6 py-10 text-center", className)}>
      <span className="mb-3 grid size-14 place-items-center rounded-2xl bg-butter-100 text-butter-700 rotate-[-4deg]">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div className={cx("flex flex-col items-start gap-3 rounded-[var(--radius-card)] bg-coral-50 p-5 ring-1 ring-coral-200 sm:flex-row sm:items-center", className)} role="alert">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-coral-700"><Icon name="alert" /></span>
      <div className="flex-1">
        <p className="font-semibold text-coral-700">We couldn&apos;t load this just now</p>
        <p className="text-sm text-ink-500">{error?.message || "Unknown error"}</p>
      </div>
      {onRetry && <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Notice({ tone = "sky", icon = "info", children, className }) {
  const t = TONE[tone];
  return (
    <div className={cx("flex gap-3 rounded-2xl p-4 text-sm", t.bg, className)}>
      <Icon name={icon} className={cx("mt-0.5", t.text)} />
      <div className="text-ink-700">{children}</div>
    </div>
  );
}

/* ── Forms ───────────────────────────────────────────────── */
export function Field({ label, hint, error, children, htmlFor }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-sm text-coral-700" role="alert">{error}</span>
        : hint && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export const inputCls = (invalid) => cx(
  "h-11 w-full rounded-[var(--radius-control)] bg-white px-3.5 text-ink-900 ring-1 transition placeholder:text-ink-300",
  "focus:outline-none focus:ring-2",
  invalid ? "ring-coral-400 focus:ring-coral-400" : "ring-paper-300 hover:ring-paper-400 focus:ring-sky-400",
);

export function Select({ className, invalid, children, ...rest }) {
  return (
    <div className="relative">
      <select className={cx(inputCls(invalid), "appearance-none pr-10", className)} {...rest}>{children}</select>
      <Icon name="chevronDown" size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search", className }) {
  return (
    <div className={cx("relative", className)}>
      <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className={cx(inputCls(false), "pl-10")} />
    </div>
  );
}

/** Pill-shaped segmented control. options: [{value,label}] */
export function Segmented({ options, value, onChange, className, size = "md" }) {
  return (
    <div className={cx("inline-flex rounded-full bg-paper-200/80 p-1", className)} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx(
            "whitespace-nowrap rounded-full font-semibold transition",
            size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
            value === o.value ? "bg-white text-ink-900 shadow-soft" : "text-ink-500 hover:text-ink-900",
          )}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, icon, tone = "ink", sub }) {
  const t = TONE[tone];
  return (
    <div className="flex items-center gap-3">
      {icon && <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", t.bg, t.text)}><Icon name={icon} /></span>}
      <div className="min-w-0">
        <p className="font-display text-2xl font-semibold leading-none tabular">{value}</p>
        <p className="mt-1 text-xs font-medium text-ink-400">{label}</p>
        {sub && <p className="text-xs text-ink-400">{sub}</p>}
      </div>
    </div>
  );
}

export const Avatar = ({ name, className, tone = "lavender" }) => {
  const t = TONE[tone];
  const ini = (name || "?").replace(/^(dr|prof)\.?\s+/i, "").split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return <span className={cx("grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold", t.bg, t.text, className)} aria-hidden>{ini}</span>;
};

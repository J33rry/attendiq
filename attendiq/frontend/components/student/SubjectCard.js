"use client";
import Link from "next/link";
import { Badge, Card, ProgressBar, cx } from "@/components/ui/primitives";
import Icon from "@/components/ui/Icon";
import { BAND, TONE, bandFor } from "@/lib/status";
import { fmtPct } from "@/lib/format";

// Each subject gets a stable notebook-tab colour so it is recognisable everywhere.
const TAB = ["sky", "lavender", "butter", "sage", "coral"];
export const subjectTone = (id) => TAB[(Number(id) - 1 + TAB.length) % TAB.length];

export function SubjectTag({ id, code }) {
  const t = TONE[subjectTone(id)];
  return <span className={cx("rounded-md px-2 py-0.5 font-mono text-[0.72rem] font-semibold", t.bg, t.text)}>{code}</span>;
}

export default function SubjectCard({ s, threshold, href }) {
  const band = bandFor({ ...s, threshold });
  const b = BAND[band];
  const missed = s.conducted - s.attended;
  return (
    <Card as={Link} href={href} interactive className="group relative block overflow-hidden p-5">
      <span className={cx("absolute inset-y-0 left-0 w-1.5", TONE[subjectTone(s.id)].fill)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SubjectTag id={s.id} code={s.code} />
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug">{s.name}</h3>
        </div>
        <Badge tone={b.tone} dot>{b.label}</Badge>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <p className={cx("font-display text-4xl font-semibold leading-none tabular", TONE[b.tone].text)}>
          {s.conducted ? fmtPct(s.percentage) : "—"}
        </p>
        <p className="text-right text-sm text-ink-500 tabular">
          <span className="font-semibold text-ink-900">{s.attended}</span> of {s.conducted} attended
          {missed > 0 && <span className="block text-xs text-ink-400">{missed} missed</span>}
        </p>
      </div>
      <ProgressBar value={s.percentage} tone={b.tone} marker={threshold} className="mt-3" />
      <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-ink-400 transition group-hover:text-ink-900">
        See details <Icon name="arrowRight" size={16} className="transition group-hover:translate-x-0.5" />
      </p>
    </Card>
  );
}

export function SubjectCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="skeleton h-5 w-16" />
      <div className="skeleton mt-3 h-6 w-2/3" />
      <div className="skeleton mt-5 h-10 w-24" />
      <div className="skeleton mt-4 h-2.5 w-full" />
    </Card>
  );
}

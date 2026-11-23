"use client";
import Link from "next/link";
import { studentApi } from "@/lib/api";
import { useApi, useThreshold } from "@/lib/hooks";
import { BAND, bandFor } from "@/lib/status";
import { fmtPct } from "@/lib/format";
import { Badge, Card, EmptyState, ErrorState, PageHeader, ProgressBar } from "@/components/ui/primitives";
import SubjectCard, { SubjectCardSkeleton, SubjectTag } from "@/components/student/SubjectCard";

export default function AttendancePage() {
  const threshold = useThreshold();
  const { data, error, reload } = useApi(() => studentApi.attendance());

  return (
    <>
      <PageHeader hand="the register" title="Your attendance"
        subtitle={threshold != null ? `Each subject needs at least ${threshold}% attendance. Cancelled classes and holidays are left out of the count.` : "Cancelled classes and holidays are left out of the count."} />
      {error ? <ErrorState error={error} onRetry={reload} /> : !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <SubjectCardSkeleton key={i} />)}</div>
      ) : !data.summary.length ? (
        <EmptyState icon="book" title="No subjects yet">You are not enrolled in any subjects right now.</EmptyState>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.summary.map((s) => <SubjectCard key={s.id} s={s} threshold={threshold} href={`/student/attendance/${s.id}`} />)}
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-paper-200 px-5 py-4">
              <h2 className="text-lg font-semibold">Side by side</h2>
            </div>
            <ul className="divide-y divide-paper-200">
              {data.summary.map((s) => {
                const b = BAND[bandFor({ ...s, threshold })];
                return (
                  <li key={s.id}>
                    <Link href={`/student/attendance/${s.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-paper-50 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_auto_auto]">
                      <span className="flex min-w-0 items-center gap-2">
                        <SubjectTag id={s.id} code={s.code} />
                        <span className="truncate font-semibold">{s.name}</span>
                      </span>
                      <ProgressBar value={s.percentage} tone={b.tone} marker={threshold} className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" />
                      <span className="text-sm text-ink-400 tabular max-sm:hidden">{s.attended}/{s.conducted}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-display text-lg font-semibold tabular">{s.conducted ? fmtPct(s.percentage) : "—"}</span>
                        <Badge tone={b.tone} className="max-md:hidden">{b.label}</Badge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

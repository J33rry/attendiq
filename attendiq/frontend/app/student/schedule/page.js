"use client";
import { useMemo } from "react";
import { studentApi } from "@/lib/api";
import { useApi, useNow } from "@/lib/hooks";
import { dayLabel, fmtRange, localDateKey, relative } from "@/lib/format";
import { Badge, Card, EmptyState, ErrorState, Notice, PageHeader, Skeleton, cx } from "@/components/ui/primitives";
import Icon from "@/components/ui/Icon";
import { SubjectTag, subjectTone } from "@/components/student/SubjectCard";
import { TONE } from "@/lib/status";

export default function SchedulePage() {
  const now = useNow(30_000);
  const dash = useApi(() => studentApi.dashboard());
  const hol = useApi(() => studentApi.holidays());

  const days = useMemo(() => {
    if (!dash.data) return null;
    const idOf = (code) => dash.data.subjects.find((s) => s.code === code)?.id ?? 0;
    const map = new Map();
    for (const u of dash.data.upcoming) {
      const k = localDateKey(u.startsAt);
      if (!map.has(k)) map.set(k, { key: k, date: u.startsAt, items: [], holiday: null });
      map.get(k).items.push({ ...u, subjectId: idOf(u.code) });
    }
    // Upcoming holidays: no classes run on these days.
    const last = dash.data.upcoming.at(-1)?.startsAt;
    for (const h of hol.data?.holidays ?? []) {
      if (h.date < localDateKey(now)) continue;
      if (last && h.date > localDateKey(last)) continue;
      if (!map.has(h.date)) map.set(h.date, { key: h.date, date: `${h.date}T12:00:00`, items: [], holiday: h });
      else map.get(h.date).holiday = h;
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [dash.data, hol.data, now]);

  const next = dash.data?.upcoming[0];

  return (
    <>
      <PageHeader hand="the timetable" title="Upcoming classes" subtitle="Your next scheduled classes. Cancelled classes are left off." />

      {dash.error ? <ErrorState error={dash.error} onRetry={dash.reload} /> : !days ? (
        <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : !days.length ? (
        <EmptyState icon="calendar" title="Your timetable is clear">No upcoming classes have been scheduled yet. Check back soon.</EmptyState>
      ) : (
        <>
          {next && (
            <Card className="relative mb-8 overflow-hidden bg-ink-900 p-6 text-paper-50 ring-0">
              <div className="absolute -right-8 -top-8 size-40 rounded-full bg-sage-500/25" />
              <div className="absolute -bottom-12 right-20 size-28 rounded-full bg-butter-300/20" />
              <p className="font-hand text-xl text-butter-200">Next up · {relative(next.startsAt, now)}</p>
              <h2 className="mt-1 text-3xl font-semibold text-paper-50">{next.subject}</h2>
              <p className="mt-1 text-paper-200">
                {dayLabel(next.startsAt, now)} · {fmtRange(next.startsAt, next.endsAt)}{next.topic ? ` · ${next.topic}` : ""}
              </p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm">
                <Icon name="rfid" size={16} /> Tap your ID card on the reader when you arrive
              </p>
            </Card>
          )}

          <ol className="relative space-y-6 border-l-2 border-dashed border-paper-300 pl-6 sm:pl-8">
            {days.map((d) => (
              <li key={d.key} className="relative">
                <span className={cx("absolute -left-[33px] top-1.5 size-4 rounded-full ring-4 ring-paper-100 sm:-left-[41px]",
                  dayLabel(d.date, now) === "Today" ? "bg-butter-400" : "bg-paper-400")} />
                <h3 className="mb-3 flex items-baseline gap-2 text-lg font-semibold">
                  {dayLabel(d.date, now)}
                  <span className="text-sm font-normal text-ink-400">{new Date(d.date).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</span>
                </h3>
                {d.holiday && (
                  <div className="mb-3 flex items-center gap-3 rounded-2xl bg-lavender-50 p-4 ring-1 ring-lavender-200">
                    <Icon name="sun" className="text-lavender-700" />
                    <p className="text-sm"><span className="font-semibold text-lavender-700">{d.holiday.name}</span> — holiday, classes on this day are cancelled and don&apos;t count.</p>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {d.items.map((u) => {
                    const live = new Date(u.startsAt) <= now && new Date(u.endsAt) >= now;
                    return (
                      <Card key={u.id} className="relative overflow-hidden p-4">
                        <span className={cx("absolute inset-x-0 top-0 h-1.5", TONE[subjectTone(u.subjectId)].fill)} />
                        <div className="flex items-center justify-between gap-2">
                          <SubjectTag id={u.subjectId} code={u.code} />
                          {live ? <Badge tone="sage" dot>In progress</Badge> : <Badge tone="sky">Scheduled</Badge>}
                        </div>
                        <p className="mt-2 font-semibold">{u.subject}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500 tabular"><Icon name="clock" size={15} /> {fmtRange(u.startsAt, u.endsAt)}</p>
                        {u.topic && <p className="mt-1 text-sm text-ink-400">{u.topic}</p>}
                      </Card>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
          <Notice tone="sky" className="mt-8">Showing your next {dash.data.upcoming.length} scheduled classes. More appear here as your faculty schedules them.</Notice>
        </>
      )}
    </>
  );
}

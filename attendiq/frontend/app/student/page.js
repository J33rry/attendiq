"use client";
import Link from "next/link";
import { studentApi } from "@/lib/api";
import { useApi, useThreshold } from "@/lib/hooks";
import { BAND, TONE, bandFor } from "@/lib/status";
import { dayLabel, firstName, fmtLongDate, fmtPct, fmtRange, fmtDate, fmtTime, greeting, plural, sameDay } from "@/lib/format";
import { Badge, Card, EmptyState, ErrorState, Section, Skeleton, Stat, cx } from "@/components/ui/primitives";
import Icon from "@/components/ui/Icon";
import ProgressRing from "@/components/ui/ProgressRing";
import SubjectCard, { SubjectCardSkeleton, SubjectTag, subjectTone } from "@/components/student/SubjectCard";
import { ChalkboardScene } from "@/components/illustrations/Classroom";

const QUICK = [
  { href: "/student/attendance", icon: "chart", title: "View Attendance", body: "Every subject, side by side.", tone: "sky" },
  { href: "/student/planner", icon: "compass", title: "Bunk Planner", body: "Can I miss the next class?", tone: "butter" },
  { href: "/student/recovery", icon: "sprout", title: "Recovery Planner", body: "How to climb back up.", tone: "sage" },
  { href: "/student/history", icon: "history", title: "Attendance History", body: "Every class, every mark.", tone: "lavender" },
  { href: "/student/schedule", icon: "calendar", title: "Upcoming Classes", body: "Your week at a glance.", tone: "coral" },
  { href: "/student/assistant", icon: "chat", title: "AttendIQ Assistant", body: "Ask about your attendance.", tone: "ink" },
];

export default function StudentDashboard() {
  const threshold = useThreshold();
  const dash = useApi(() => studentApi.dashboard());
  const hist = useApi(() => studentApi.attendance());

  if (dash.error) return <ErrorState error={dash.error} onRetry={dash.reload} />;
  const d = dash.data;

  return (
    <div className="space-y-10">
      <Hero d={d} threshold={threshold} />
      <Overview d={d} threshold={threshold} />

      <Section title="Your subjects" hand="tap a card for the full story"
        action={<Link href="/student/attendance" className="text-sm font-semibold text-sage-700 hover:underline">All attendance</Link>}>
        {!d ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <SubjectCardSkeleton key={i} />)}</div>
        ) : d.subjects.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {d.subjects.map((s) => <SubjectCard key={s.id} s={s} threshold={threshold} href={`/student/attendance/${s.id}`} />)}
          </div>
        ) : (
          <EmptyState icon="book" title="No subjects yet">Once you are enrolled in subjects, they will show up here.</EmptyState>
        )}
      </Section>

      <Section title="Quick actions">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {QUICK.map((q) => (
            <Card key={q.href} as={Link} href={q.href} interactive className="group flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <span className={cx("grid size-11 shrink-0 place-items-center rounded-2xl transition group-hover:rotate-[-6deg]", TONE[q.tone].bg, TONE[q.tone].text)}>
                <Icon name={q.icon} size={22} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-tight">{q.title}</span>
                <span className="block text-sm text-ink-400">{q.body}</span>
              </span>
            </Card>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Coming up next" action={<Link href="/student/schedule" className="text-sm font-semibold text-sage-700 hover:underline">Timetable</Link>}>
          <UpcomingList items={d?.upcoming} subjects={d?.subjects} />
        </Section>
        <Section title="Recently marked" action={<Link href="/student/history" className="text-sm font-semibold text-sage-700 hover:underline">History</Link>}>
          <RecentList hist={hist} />
        </Section>
      </div>
    </div>
  );
}

function contextLine(d, threshold, now) {
  if (!d) return "";
  const today = d.upcoming.filter((u) => sameDay(u.startsAt, now));
  const band = bandFor({ ...d.overall, threshold });
  const parts = [];
  if (today.length) parts.push(`${plural(today.length, "class", "classes")} left today — next up is ${today[0].subject} at ${fmtTime(today[0].startsAt)}.`);
  else if (d.upcoming[0]) parts.push(`No more classes today. Next: ${d.upcoming[0].subject}, ${dayLabel(d.upcoming[0].startsAt).toLowerCase()}.`);
  if (band === "good") parts.push("You're comfortably on track.");
  if (band === "close") parts.push("You're just above the line — every class counts a little extra right now.");
  if (band === "low") parts.push("Let's build some momentum this week.");
  return parts.join(" ");
}

function Hero({ d, threshold }) {
  const now = new Date();
  return (
    <Card className="paper-ruled relative overflow-hidden bg-paper-50 p-6 pl-12 sm:p-8 sm:pl-14">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="font-hand text-xl text-ink-400">{fmtLongDate(now)}</p>
          {d ? (
            <>
              <h1 className="mt-1 text-3xl font-semibold leading-tight sm:text-4xl">{greeting(now)}, {firstName(d.profile.name)}!</h1>
              <p className="mt-2 max-w-xl text-ink-500">{contextLine(d, threshold, now) || "Ready for another productive day on campus?"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="lavender">Roll no. {d.profile.rollNo}</Badge>
                <Badge tone="sky">{d.profile.department} · Semester {d.profile.semester}</Badge>
                {d.profile.rfidRegistered
                  ? <Badge tone="sage" dot>ID card registered</Badge>
                  : <Badge tone="butter" dot>ID card not registered yet</Badge>}
              </div>
            </>
          ) : (
            <div className="mt-2 space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-4 w-96 max-w-full" /><Skeleton className="h-6 w-56" /></div>
          )}
        </div>
        <ChalkboardScene className="hidden w-56 shrink-0 md:block lg:w-64" message={d && bandFor({ ...d.overall, threshold }) === "good" ? "Great going!" : "You've got this"} />
      </div>
    </Card>
  );
}

function Overview({ d, threshold }) {
  if (!d) return <Card className="p-6"><div className="flex items-center gap-8"><Skeleton className="size-44 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-2/3" /></div></div></Card>;
  const o = d.overall;
  const band = bandFor({ ...o, threshold });
  const b = BAND[band];
  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-10">
        <ProgressRing value={o.percentage} tone={b.tone} marker={threshold} size={184} label={`Overall attendance ${o.percentage}%`}>
          <div>
            <p className="font-display text-[2.6rem] font-semibold leading-none tabular">{o.conducted ? fmtPct(o.percentage) : "—"}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-400">overall</p>
          </div>
        </ProgressRing>
        <div className="w-full min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={b.tone} dot>{b.label}</Badge>
            {threshold != null && <span className="text-sm text-ink-400">Requirement: {threshold}%</span>}
          </div>
          <p className="mt-2 text-lg text-ink-700">{b.note}</p>
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Stat label="Classes held" value={o.conducted} icon="board" tone="sky" />
            <Stat label="Attended" value={o.attended} icon="check" tone="sage" />
            <Stat label="Missed" value={o.conducted - o.attended} icon="coffee" tone="butter" />
            <Stat label="Subjects" value={d.subjects.length} icon="book" tone="lavender" />
          </div>
          <p className="mt-5 text-xs text-ink-400">The dark tick on the ring marks the requirement. Cancelled classes and holidays are not counted.</p>
        </div>
      </div>
    </Card>
  );
}

function UpcomingList({ items, subjects }) {
  if (!items) return <Card className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</Card>;
  if (!items.length) return <EmptyState icon="calendar" title="Nothing scheduled">No upcoming classes have been scheduled yet.</EmptyState>;
  return (
    <Card className="divide-y divide-paper-200 p-2">
      {items.slice(0, 4).map((u) => (
        <div key={u.id} className="flex items-center gap-3 rounded-xl p-3">
          <div className={cx("w-14 shrink-0 rounded-xl py-1.5 text-center", TONE[subjectTone(subjectIdFromCode(subjects, u.code))].bg)}>
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-ink-400">{new Date(u.startsAt).toLocaleDateString([], { weekday: "short" })}</p>
            <p className="font-display text-lg font-semibold leading-none">{new Date(u.startsAt).getDate()}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{u.subject}</p>
            <p className="truncate text-sm text-ink-400">{fmtRange(u.startsAt, u.endsAt)}{u.topic ? ` · ${u.topic}` : ""}</p>
          </div>
          <Badge tone={dayLabel(u.startsAt) === "Today" ? "butter" : "ink"}>{dayLabel(u.startsAt)}</Badge>
        </div>
      ))}
    </Card>
  );
}

function RecentList({ hist }) {
  if (hist.error) return <ErrorState error={hist.error} onRetry={hist.reload} />;
  if (!hist.data) return <Card className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</Card>;
  const rows = hist.data.history.slice(0, 4);
  if (!rows.length) return <EmptyState icon="rfid" title="No marks yet">Tap your ID card at your next class and it will appear here.</EmptyState>;
  return (
    <Card className="divide-y divide-paper-200 p-2">
      {rows.map((r) => (
        <div key={r.sessionId} className="flex items-center gap-3 rounded-xl p-3">
          <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", r.status === "present" ? "bg-sage-50 text-sage-700" : "bg-coral-50 text-coral-700")}>
            <Icon name={r.status === "present" ? "check" : "x"} size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{r.subject}</p>
            <p className="text-sm text-ink-400">{fmtDate(r.startsAt)} · {r.source === "rfid" ? "ID card tap" : "Marked by faculty"}</p>
          </div>
          <SubjectTag id={subjectIdFromCode(hist.data.summary, r.code)} code={r.code} />
        </div>
      ))}
    </Card>
  );
}

const subjectIdFromCode = (summary, code) => summary.find((s) => s.code === code)?.id ?? 0;

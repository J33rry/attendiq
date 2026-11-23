"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { facultyApi } from "@/lib/api";
import { useApi, useNow } from "@/lib/hooks";
import { firstName, fmtDate, fmtLongDate, fmtPct, greeting, plural } from "@/lib/format";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, ProgressBar, Section, Skeleton, Stat, cx } from "@/components/ui/primitives";
import Icon from "@/components/ui/Icon";
import { DeskScene } from "@/components/illustrations/Classroom";
import { SubjectTag, subjectTone } from "@/components/student/SubjectCard";
import { phaseOf } from "@/components/faculty/session-utils";
import SessionRow from "@/components/faculty/SessionRow";
import SessionForm from "@/components/faculty/SessionForm";
import { TONE } from "@/lib/status";

async function loadOverview() {
  const dash = await facultyApi.dashboard();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 14 * 86_400_000);
  const weekAhead = new Date(now.getTime() + 14 * 86_400_000);
  const [rosters, recent, upcoming] = await Promise.all([
    Promise.all(dash.subjects.map((s) => facultyApi.subject(s.id))),
    facultyApi.sessions({ from: weekAgo.toISOString(), to: now.toISOString() }),
    facultyApi.sessions({ from: now.toISOString(), to: weekAhead.toISOString() }),
  ]);
  return { ...dash, rosters, recent: recent.sessions.reverse(), upcoming: upcoming.sessions };
}

export default function FacultyDashboard() {
  const now = useNow(30_000);
  const { data: d, error, reload } = useApi(loadOverview);
  const [creating, setCreating] = useState(false);

  const students = useMemo(() => {
    if (!d) return null;
    const map = new Map();
    for (const r of d.rosters) {
      for (const s of r.students) {
        const cur = map.get(s.studentId) ?? { ...s, low: [] };
        if (!s.eligible && s.conducted > 0) cur.low.push({ code: r.subject.code, id: r.subject.id, percentage: s.percentage });
        map.set(s.studentId, cur);
      }
    }
    return [...map.values()];
  }, [d]);

  if (error) return <ErrorState error={error} onRetry={reload} />;

  const todayList = d?.today ?? [];
  const live = todayList.find((s) => phaseOf(s, now) === "live");
  const needsMarking = d?.recent.filter((s) => phaseOf(s, now) === "unmarked") ?? [];
  const nudges = students?.filter((s) => s.low.length).sort((a, b) => b.low.length - a.low.length) ?? [];

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <Card className="relative overflow-hidden bg-paper-50 p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="font-hand text-xl text-ink-400">{fmtLongDate(now)}</p>
            {d ? (
              <>
                <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
                  {now.getHours() < 12 ? greeting(now) : "Welcome back"}, {firstName(d.profile.name)}!
                </h1>
                <p className="mt-2 max-w-xl text-ink-500">
                  {live ? `${live.subject} is in progress right now — students can tap in.`
                    : todayList.filter((s) => s.status !== "cancelled").length
                      ? `You have ${plural(todayList.filter((s) => s.status !== "cancelled").length, "session", "sessions")} on today's register.`
                      : "No sessions on today's register. A good day to plan ahead."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="sky">{d.profile.department}</Badge>
                  <Badge tone="lavender">Employee ID {d.profile.employeeId}</Badge>
                </div>
              </>
            ) : <div className="mt-2 space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-4 w-80" /></div>}
          </div>
          <DeskScene className="hidden w-60 shrink-0 md:block" />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="sage" icon="plus" onClick={() => setCreating(true)} disabled={!d}>Schedule a class</Button>
          {live && <Button href={`/faculty/sessions/${live.id}`} variant="secondary" icon="rfid">Open live register</Button>}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Subjects you teach", value: d?.subjects.length, icon: "book", tone: "lavender" },
          { label: "Students across them", value: students?.length, icon: "users", tone: "sky" },
          { label: "Sessions conducted", value: d?.sessionCounts.conducted ?? 0, icon: "check", tone: "sage" },
          { label: "Sessions scheduled", value: d?.sessionCounts.scheduled ?? 0, icon: "calendar", tone: "butter" },
        ].map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">{d ? <Stat {...s} /> : <Skeleton className="h-11" />}</Card>
        ))}
      </div>

      {needsMarking.length > 0 && (
        <Card className="flex flex-col gap-3 bg-butter-50 p-5 ring-butter-200 sm:flex-row sm:items-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-butter-700"><Icon name="pencil" /></span>
          <div className="flex-1">
            <p className="font-semibold">{plural(needsMarking.length, "past session has", "past sessions have")} no attendance yet</p>
            <p className="text-sm text-ink-500">Students without a mark count as absent. {needsMarking.slice(0, 2).map((s) => `${s.code} on ${fmtDate(s.startsAt)}`).join(", ")}{needsMarking.length > 2 ? "…" : ""}</p>
          </div>
          <Button href={`/faculty/sessions/${needsMarking[0].id}`} variant="secondary" size="sm" iconRight="arrowRight">Mark now</Button>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Your subjects" action={<Link href="/faculty/subjects" className="text-sm font-semibold text-sage-700 hover:underline">All subjects</Link>}>
          {!d ? <Skeleton className="h-60" /> : !d.subjects.length ? (
            <EmptyState icon="book" title="No subjects assigned">Subjects assigned to you will appear here.</EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
              {d.subjects.map((s) => (
                <Card key={s.id} as={Link} href={`/faculty/subjects/${s.id}`} interactive className="relative overflow-hidden p-5">
                  <span className={cx("absolute inset-y-0 left-0 w-1.5", TONE[subjectTone(s.id)].fill)} />
                  <SubjectTag id={s.id} code={s.code} />
                  <h3 className="mt-2 truncate font-semibold">{s.name}</h3>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="font-display text-3xl font-semibold tabular">{s.conducted ? fmtPct(s.averagePercentage) : "—"}</p>
                    <p className="text-right text-xs text-ink-400">class average<br />{s.conducted} held</p>
                  </div>
                  <ProgressBar value={s.averagePercentage} tone="sky" size="sm" className="mt-2" />
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-ink-500">{plural(s.enrolled, "student", "students")}</span>
                    {s.belowThreshold > 0 ? <Badge tone="coral">{s.belowThreshold} below requirement</Badge> : <Badge tone="sage">All on track</Badge>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section title="Today" action={<Link href="/faculty/sessions" className="text-sm font-semibold text-sage-700 hover:underline">All sessions</Link>}>
          {!d ? <Skeleton className="h-60" /> : !todayList.length ? (
            <EmptyState icon="coffee" title="Nothing on today">Enjoy the breathing room, or schedule something new.</EmptyState>
          ) : (
            <Card className="divide-y divide-paper-200 p-2">
              {todayList.map((s) => <SessionRow key={s.id} s={s} now={now} />)}
            </Card>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Recent sessions" hand="last two weeks">
          {!d ? <Skeleton className="h-48" /> : !d.recent.length ? (
            <EmptyState icon="history" title="No recent sessions">Sessions from the last two weeks will show here.</EmptyState>
          ) : (
            <Card className="divide-y divide-paper-200 p-2">{d.recent.slice(0, 5).map((s) => <SessionRow key={s.id} s={s} now={now} showDay />)}</Card>
          )}
        </Section>
        <Section title="Students who may need a nudge" hand="below the requirement">
          {!students ? <Skeleton className="h-48" /> : !nudges.length ? (
            <EmptyState icon="party" title="Everyone's on track">No student is below the requirement in your subjects.</EmptyState>
          ) : (
            <Card className="divide-y divide-paper-200 p-2">
              {nudges.slice(0, 6).map((s) => (
                <div key={s.studentId} className="flex items-center gap-3 p-3">
                  <Avatar name={s.name} tone="butter" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.name}</p>
                    <p className="text-xs text-ink-400">{s.rollNo}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {s.low.map((l) => (
                      <Link key={l.id} href={`/faculty/subjects/${l.id}`}><Badge tone="coral">{l.code} · {fmtPct(l.percentage)}</Badge></Link>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </Section>
      </div>

      {d && <SessionForm open={creating} onClose={() => setCreating(false)} subjects={d.subjects} onSaved={reload} />}
    </div>
  );
}

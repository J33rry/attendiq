"use client";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { facultyApi } from "@/lib/api";
import { useApi, useNow } from "@/lib/hooks";
import { dayLabel, fmtRange, localDateKey, plural } from "@/lib/format";
import { Button, Card, EmptyState, ErrorState, IconButton, PageHeader, Segmented, Select, Skeleton, cx } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { SubjectTag } from "@/components/student/SubjectCard";
import SessionForm, { HolidayForm } from "@/components/faculty/SessionForm";
import { SessionBadge } from "@/components/faculty/session-utils";

const VIEWS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

export default function SessionsPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><Sessions /></Suspense>;
}

function Sessions() {
  const params = useSearchParams();
  const toast = useToast();
  const now = useNow(30_000);
  const [view, setView] = useState("upcoming");
  const [subjectId, setSubjectId] = useState(params.get("subject") ?? "");
  const [editing, setEditing] = useState(null); // null | "new" | session
  const [holiday, setHoliday] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);

  const dash = useApi(() => facultyApi.dashboard());
  const subjects = dash.data?.subjects;
  const list = useApi(() => {
    const nowIso = new Date().toISOString();
    const q = { subjectId: subjectId || undefined };
    if (view === "upcoming") { q.from = nowIso; q.status = undefined; }
    if (view === "past") q.to = nowIso;
    if (view === "cancelled") q.status = "cancelled";
    return facultyApi.sessions(q);
  }, [view, subjectId]);

  const groups = useMemo(() => {
    if (!list.data) return null;
    let rows = list.data.sessions;
    if (view === "upcoming") rows = rows.filter((s) => s.status !== "cancelled");
    if (view === "past") rows = [...rows].reverse();
    const map = new Map();
    for (const s of rows) {
      const k = localDateKey(s.startsAt);
      if (!map.has(k)) map.set(k, { key: k, date: s.startsAt, items: [] });
      map.get(k).items.push(s);
    }
    return [...map.values()];
  }, [list.data, view]);

  async function confirmCancel() {
    setBusy(true);
    try {
      await facultyApi.cancelSession(cancelling.id);
      toast.success("Session cancelled", `${cancelling.subject} on ${dayLabel(cancelling.startsAt).toLowerCase()} won't count towards anyone's attendance.`);
      setCancelling(null);
      list.reload();
    } catch (e) {
      toast.error("Couldn't cancel the session", e.message);
    } finally { setBusy(false); }
  }

  const total = groups?.reduce((n, g) => n + g.items.length, 0) ?? 0;

  return (
    <>
      <PageHeader hand="the timetable" title="Class sessions" subtitle="Schedule classes, adjust times and keep the register in order."
        action={<>
          <Button variant="secondary" icon="sun" onClick={() => setHoliday(true)}>Mark holiday</Button>
          <Button variant="sage" icon="plus" onClick={() => setEditing("new")} disabled={!subjects?.length}>New session</Button>
        </>} />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Segmented value={view} onChange={setView} options={VIEWS} />
        </div>
        <div className="sm:w-64">
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label="Filter by subject">
            <option value="">All subjects</option>
            {subjects?.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </Select>
        </div>
      </div>

      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !groups ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : !groups.length ? (
        <EmptyState icon="calendar" title={view === "cancelled" ? "No cancelled sessions" : view === "past" ? "No past sessions" : "Nothing scheduled"}
          action={view === "upcoming" && subjects?.length ? <Button variant="sage" icon="plus" onClick={() => setEditing("new")}>Schedule a class</Button> : null}>
          {view === "upcoming" ? "Schedule a class and it will show up for your students straight away." : "Try another filter."}
        </EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-400">{plural(total, "session", "sessions")}</p>
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.key}>
                <h2 className="mb-2 flex items-baseline gap-2 text-base font-semibold">
                  {dayLabel(g.date, now)}
                  <span className="text-sm font-normal text-ink-400">{new Date(g.date).toLocaleDateString([], { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
                </h2>
                <Card className="divide-y divide-paper-200">
                  {g.items.map((s) => (
                    <div key={s.id} className={cx("flex flex-wrap items-center gap-x-4 gap-y-2 p-4", s.status === "cancelled" && "bg-paper-50")}>
                      <div className="w-28 shrink-0 text-sm font-semibold tabular">{fmtRange(s.startsAt, s.endsAt)}</div>
                      <Link href={`/faculty/sessions/${s.id}`} className="group min-w-0 flex-1 basis-48">
                        <span className="flex items-center gap-2">
                          <SubjectTag id={s.subjectId} code={s.code} />
                          <span className={cx("truncate font-semibold group-hover:underline", s.status === "cancelled" && "text-ink-400 line-through")}>{s.subject}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-ink-400">{s.topic || "No topic added"}{s.holidayId ? " · holiday" : ""}</span>
                      </Link>
                      <SessionBadge s={s} now={now} />
                      <div className="flex items-center gap-1">
                        {s.status !== "cancelled" && <>
                          <IconButton icon="pencil" label="Edit session" onClick={() => setEditing(s)} />
                          <IconButton icon="ban" label="Cancel session" onClick={() => setCancelling(s)} className="hover:!bg-coral-50 hover:!text-coral-700" />
                        </>}
                        <Button href={`/faculty/sessions/${s.id}`} variant="secondary" size="sm" iconRight="chevronRight">Register</Button>
                      </div>
                    </div>
                  ))}
                </Card>
              </section>
            ))}
          </div>
        </>
      )}

      {subjects && (
        <SessionForm open={!!editing} onClose={() => setEditing(null)} subjects={subjects}
          session={editing && editing !== "new" ? editing : null} onSaved={list.reload} />
      )}
      <HolidayForm open={holiday} onClose={() => setHoliday(false)} onSaved={list.reload} />
      <ConfirmDialog open={!!cancelling} onClose={() => setCancelling(null)} onConfirm={confirmCancel} loading={busy}
        title="Cancel this session?" confirmLabel="Yes, cancel session">
        {cancelling && <>
          <p><strong>{cancelling.subject}</strong> · {dayLabel(cancelling.startsAt)} · {fmtRange(cancelling.startsAt, cancelling.endsAt)}</p>
          <p className="mt-2">The session will be removed from every student&apos;s attendance count, and the RFID reader will reject taps for it. Cancelled sessions can&apos;t be reopened.</p>
        </>}
      </ConfirmDialog>
    </>
  );
}

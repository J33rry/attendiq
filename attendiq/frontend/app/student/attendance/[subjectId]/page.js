"use client";
import { useParams } from "next/navigation";
import { studentApi } from "@/lib/api";
import { useApi, useThreshold } from "@/lib/hooks";
import { BAND, bandFor } from "@/lib/status";
import { fmtPct, plural } from "@/lib/format";
import { Badge, Button, Card, EmptyState, ErrorState, Notice, PageHeader, Skeleton, Stat } from "@/components/ui/primitives";
import ProgressRing from "@/components/ui/ProgressRing";
import HistoryList from "@/components/student/HistoryList";

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const id = Number(subjectId);
  const threshold = useThreshold();
  const att = useApi(() => studentApi.attendance(id), [id]);
  const plan = useApi(() => studentApi.bunk(1, id), [id]);

  const s = att.data?.summary.find((x) => x.id === id);
  if (att.error) return <ErrorState error={att.error} onRetry={att.reload} />;
  if (att.data && !s) {
    return <EmptyState icon="book" title="Subject not found" action={<Button href="/student/attendance" variant="secondary">Back to attendance</Button>}>
      You don&apos;t seem to be enrolled in this subject.
    </EmptyState>;
  }

  const band = s ? bandFor({ ...s, threshold }) : null;
  const b = band ? BAND[band] : null;
  const p = plan.data?.plans[0];
  const now = new Date();
  const markedHeld = att.data?.history.filter((h) => h.sessionStatus !== "cancelled" && new Date(h.startsAt) <= now).length ?? 0;
  const unmarked = s ? Math.max(0, s.conducted - markedHeld) : 0;

  return (
    <>
      <PageHeader back={{ href: "/student/attendance", label: "All subjects" }} hand={s?.code} title={s?.name || "…"} />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-6">
          {!s ? <Skeleton className="h-48" /> : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <ProgressRing value={s.percentage} tone={b.tone} marker={threshold} size={160} label={`${s.name} ${s.percentage}%`}>
                <p className="font-display text-4xl font-semibold tabular">{s.conducted ? fmtPct(s.percentage) : "—"}</p>
              </ProgressRing>
              <div className="w-full flex-1">
                <Badge tone={b.tone} dot>{b.label}</Badge>
                <p className="mt-2 text-ink-700">{b.note}</p>
                <div className="mt-5 grid grid-cols-3 gap-4">
                  <Stat label="Held" value={s.conducted} />
                  <Stat label="Attended" value={s.attended} />
                  <Stat label="Still to come" value={s.upcoming} />
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Room to breathe</h2>
          {plan.error ? <ErrorState error={plan.error} onRetry={plan.reload} className="mt-3" /> : !p ? <Skeleton className="mt-3 h-28" /> : (
            <>
              <p className="mt-1 text-ink-500">Straight from the planner, based on today&apos;s numbers.</p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-5xl font-semibold tabular">{p.maxSafeSkips}</span>
                <span className="text-ink-500">{p.maxSafeSkips === 1 ? "class you can miss" : "classes you can miss"} and still stay at {threshold ?? plan.data.threshold}%+</span>
              </div>
              <Notice tone={p.canSkip ? "sage" : "butter"} icon={p.canSkip ? "check" : "info"} className="mt-4">
                If you miss the next class, you&apos;d be at <strong>{fmtPct(p.percentageAfterSkipping)}</strong>.{" "}
                {p.canSkip ? "Still above the requirement." : "That would put you under the requirement, so attending is the better plan."}
              </Notice>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href="/student/planner" variant="secondary" size="sm" icon="compass">Try other scenarios</Button>
                {s && !s.eligible && <Button href="/student/recovery" variant="secondary" size="sm" icon="sprout">Recovery plan</Button>}
              </div>
            </>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-10 text-xl font-semibold">Class by class</h2>
      {s && unmarked > 0 && (
        <Notice tone="sky" className="mb-4">
          {plural(unmarked, "held class has", "held classes have")} no mark yet — those count as absent until your faculty updates them.
        </Notice>
      )}
      <HistoryList rows={att.data?.history} summary={att.data?.summary} />
    </>
  );
}

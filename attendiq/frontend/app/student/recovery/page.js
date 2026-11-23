"use client";
import { studentApi } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { fmtPct, plural } from "@/lib/format";
import { Badge, Button, Card, EmptyState, ErrorState, Notice, PageHeader, ProgressBar, Skeleton, cx } from "@/components/ui/primitives";
import Icon from "@/components/ui/Icon";
import { SubjectTag } from "@/components/student/SubjectCard";

export default function RecoveryPlanner() {
  // Every figure here comes from GET /api/student/planner/recovery.
  const { data, error, reload } = useApi(() => studentApi.recovery());

  return (
    <>
      <PageHeader hand="one class at a time" title="Recovery Planner"
        subtitle={data ? `How many classes in a row it takes to get each subject back to ${data.threshold}%.` : "How many classes in a row it takes to get back on track."} />

      {error ? <ErrorState error={error} onRetry={reload} /> : !data ? <Skeleton className="h-60" /> : data.allClear ? (
        <EmptyState icon="party" title="Nothing to recover!"
          action={<Button href="/student/planner" variant="secondary" icon="compass">Open the Bunk Planner</Button>}>
          Every subject is at or above {data.threshold}%. Keep the rhythm going and this page stays empty.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          <Notice tone="sage" icon="sprout">
            You&apos;re making progress. Attending your next classes consistently will lift your percentage step by step — each class you attend counts.
          </Notice>
          {data.plans.map((p) => <RecoveryCard key={p.subjectId} p={p} threshold={data.threshold} />)}
        </div>
      )}
    </>
  );
}

function RecoveryCard({ p, threshold }) {
  // Visual path: the `classesNeeded` steps, each one a class to attend.
  const steps = Math.min(p.classesNeeded, 24);
  const scheduled = Math.min(p.upcomingClasses, steps);
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SubjectTag id={p.subjectId} code={p.code} />
            <Badge tone={p.feasible ? "sage" : "butter"} dot>{p.feasible ? "Reachable this term" : "Longer climb"}</Badge>
          </div>
          <h2 className="mt-2 text-xl font-semibold">{p.name}</h2>
          <p className="mt-1 text-sm text-ink-500 tabular">{p.attended} of {p.conducted} attended · now at {fmtPct(p.currentPercentage)}</p>
        </div>
        <div className="flex items-baseline gap-2 md:text-right">
          <span className="font-display text-5xl font-semibold leading-none tabular text-ink-900">{p.classesNeeded}</span>
          <span className="text-sm text-ink-500">{p.classesNeeded === 1 ? "class" : "classes"} in a row<br className="max-md:hidden" /> to reach {threshold}%</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-ink-400"><span>Now {fmtPct(p.currentPercentage)}</span><span>Goal {threshold}%</span></div>
        <ProgressBar value={p.currentPercentage} tone="coral" marker={threshold} />
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5" aria-label={`${p.classesNeeded} classes needed, ${p.upcomingClasses} scheduled`}>
        {Array.from({ length: steps }, (_, i) => (
          <span key={i}
            className={cx("grid size-7 place-items-center rounded-lg text-[0.65rem] font-bold",
              i < scheduled ? "bg-sage-50 text-sage-700 ring-1 ring-sage-200" : "border border-dashed border-paper-400 bg-paper-50 text-ink-300")}>
            {i + 1}
          </span>
        ))}
        {p.classesNeeded > steps && <span className="self-center text-xs text-ink-400">+{p.classesNeeded - steps} more</span>}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded bg-sage-200" /> already on the timetable</span>
        {!p.feasible && <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded bg-paper-300" /> not scheduled yet</span>}
      </p>

      <div className={cx("mt-5 flex gap-3 rounded-2xl p-4 text-sm", p.feasible ? "bg-sage-50" : "bg-butter-50")}>
        <Icon name={p.feasible ? "target" : "info"} className={p.feasible ? "text-sage-700" : "text-butter-700"} />
        <p className="text-ink-700">
          {p.feasible
            ? <>Attend the next {plural(p.classesNeeded, "class", "classes")} of {p.name} and you&apos;ll be back at {threshold}%. {plural(p.upcomingClasses, "class is", "classes are")} already scheduled, so it&apos;s within reach.</>
            : <>Only {plural(p.upcomingClasses, "class is", "classes are")} scheduled so far, and you need {p.classesNeeded}. Attend every one of them — each lifts your percentage — and have a word with your faculty about the rest.</>}
        </p>
      </div>
    </Card>
  );
}

"use client";
import Link from "next/link";
import { facultyApi } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { fmtPct, plural } from "@/lib/format";
import { TONE } from "@/lib/status";
import { Badge, Card, EmptyState, ErrorState, PageHeader, ProgressBar, Skeleton, Stat, cx } from "@/components/ui/primitives";
import Icon from "@/components/ui/Icon";
import { SubjectTag, subjectTone } from "@/components/student/SubjectCard";

export default function FacultySubjects() {
  const { data, error, reload } = useApi(() => facultyApi.dashboard());
  return (
    <>
      <PageHeader hand="your classes" title="Subjects & students" subtitle="Open a subject to see its full roster and each student's attendance." />
      {error ? <ErrorState error={error} onRetry={reload} /> : !data ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52" />)}</div>
      ) : !data.subjects.length ? (
        <EmptyState icon="book" title="No subjects assigned">Subjects assigned to you will appear here.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.subjects.map((s) => (
            <Card key={s.id} as={Link} href={`/faculty/subjects/${s.id}`} interactive className="group relative overflow-hidden p-6">
              <span className={cx("absolute inset-x-0 top-0 h-2", TONE[subjectTone(s.id)].fill)} />
              <div className="flex items-start justify-between">
                <SubjectTag id={s.id} code={s.code} />
                {s.belowThreshold > 0 ? <Badge tone="coral">{s.belowThreshold} need attention</Badge> : <Badge tone="sage">All on track</Badge>}
              </div>
              <h2 className="mt-3 text-xl font-semibold">{s.name}</h2>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat label="Students" value={s.enrolled} />
                <Stat label="Held" value={s.conducted} />
                <Stat label="Average" value={s.conducted ? fmtPct(s.averagePercentage) : "—"} />
              </div>
              <ProgressBar value={s.averagePercentage} tone="sky" size="sm" className="mt-4" />
              <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-ink-400 group-hover:text-ink-900">
                View {plural(s.enrolled, "student", "students")} <Icon name="arrowRight" size={16} />
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

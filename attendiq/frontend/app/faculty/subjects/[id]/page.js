"use client";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { facultyApi } from "@/lib/api";
import { useApi, useNow } from "@/lib/hooks";
import { fmtPct } from "@/lib/format";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, PageHeader, ProgressBar, SearchInput, Segmented, Skeleton, Stat } from "@/components/ui/primitives";
import SessionRow from "@/components/faculty/SessionRow";

const SORTS = { roll: (a, b) => a.rollNo.localeCompare(b.rollNo), low: (a, b) => a.percentage - b.percentage, name: (a, b) => a.name.localeCompare(b.name) };

export default function FacultySubject() {
  const { id } = useParams();
  const now = useNow(60_000);
  const { data, error, reload } = useApi(() => facultyApi.subject(id), [id]);
  const sessions = useApi(() => facultyApi.sessions({ subjectId: id }), [id]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("roll");

  const rows = useMemo(() => {
    if (!data) return null;
    const term = q.trim().toLowerCase();
    return data.students
      .filter((s) => !term || s.name.toLowerCase().includes(term) || s.rollNo.toLowerCase().includes(term))
      .filter((s) => filter === "all" || (filter === "low" ? !s.eligible : s.eligible))
      .sort(SORTS[sort]);
  }, [data, q, filter, sort]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const sum = data?.summary;
  const recent = sessions.data?.sessions.filter((s) => new Date(s.startsAt) <= now).slice(-4).reverse();

  return (
    <>
      <PageHeader back={{ href: "/faculty/subjects", label: "All subjects" }} hand={data?.subject.code} title={data?.subject.name ?? "…"}
        action={<Button href={`/faculty/sessions?subject=${id}`} variant="secondary" icon="calendar">Sessions</Button>} />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Enrolled", value: sum?.enrolled, icon: "users", tone: "sky" },
          { label: "Classes held", value: sum?.conducted, icon: "board", tone: "lavender" },
          { label: "Class average", value: sum ? (sum.conducted ? fmtPct(sum.averagePercentage) : "—") : null, icon: "chart", tone: "sage" },
          { label: "Below requirement", value: sum?.belowThreshold, icon: "flag", tone: "coral" },
        ].map((s) => <Card key={s.label} className="p-4 sm:p-5">{sum ? <Stat {...s} /> : <Skeleton className="h-11" />}</Card>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput value={q} onChange={setQ} placeholder="Search by name or roll number" className="md:max-w-xs md:flex-1" />
            <Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: "all", label: "Everyone" }, { value: "low", label: "Needs attention" }, { value: "ok", label: "On track" }]} />
            <label className="flex items-center gap-2 text-sm text-ink-500 md:ml-auto">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg bg-white px-2 py-1.5 font-semibold text-ink-900 ring-1 ring-paper-300">
                <option value="roll">Roll no.</option><option value="name">Name</option><option value="low">Lowest first</option>
              </select>
            </label>
          </div>

          {!rows ? <Skeleton className="h-72" /> : !data.students.length ? (
            <EmptyState icon="users" title="No students enrolled">Students enrolled in this subject will appear here.</EmptyState>
          ) : !rows.length ? (
            <EmptyState icon="search" title="No one matches">Try a different name, roll number or filter.</EmptyState>
          ) : (
            <Card className="divide-y divide-paper-200">
              {rows.map((s) => (
                <div key={s.studentId} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 p-4 md:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1.5fr)_auto]">
                  <Avatar name={s.name} tone={s.eligible ? "sage" : "butter"} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.name}</p>
                    <p className="text-xs text-ink-400">{s.rollNo} · {s.attended}/{s.conducted} attended</p>
                  </div>
                  <ProgressBar value={s.percentage} tone={s.eligible ? "sage" : "coral"} size="sm" className="col-span-3 row-start-2 md:col-span-1 md:row-start-auto" />
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-semibold tabular">{s.conducted ? fmtPct(s.percentage) : "—"}</span>
                    <Badge tone={s.eligible ? "sage" : "coral"} className="max-sm:hidden">{s.eligible ? "On track" : "Below"}</Badge>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>

        <aside>
          <h2 className="mb-3 text-lg font-semibold">Latest sessions</h2>
          {sessions.error ? <ErrorState error={sessions.error} onRetry={sessions.reload} /> : !recent ? <Skeleton className="h-48" /> : !recent.length ? (
            <EmptyState icon="calendar" title="No sessions held yet" />
          ) : (
            <Card className="divide-y divide-paper-200 p-2">{recent.map((s) => <SessionRow key={s.id} s={s} now={now} showDay />)}</Card>
          )}
        </aside>
      </div>
    </>
  );
}

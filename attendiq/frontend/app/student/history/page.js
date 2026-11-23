"use client";
import { useMemo, useState } from "react";
import { studentApi } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { localDateKey } from "@/lib/format";
import { Button, Card, ErrorState, Notice, PageHeader, Segmented, Select, inputCls } from "@/components/ui/primitives";
import HistoryList from "@/components/student/HistoryList";

export default function HistoryPage() {
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Subject filtering is done by the API; date & status filters narrow the returned list.
  const { data, error, reload } = useApi(() => studentApi.attendance(subjectId || undefined), [subjectId]);
  const subjects = useApi(() => studentApi.attendance(), []);

  const rows = useMemo(() => {
    if (!data) return null;
    return data.history.filter((r) => {
      const k = localDateKey(r.startsAt);
      if (from && k < from) return false;
      if (to && k > to) return false;
      if (status === "present") return r.status === "present" && r.sessionStatus !== "cancelled";
      if (status === "absent") return r.status === "absent" && r.sessionStatus !== "cancelled";
      return true;
    });
  }, [data, from, to, status]);

  const counts = useMemo(() => {
    if (!rows) return null;
    const live = rows.filter((r) => r.sessionStatus !== "cancelled");
    return { present: live.filter((r) => r.status === "present").length, absent: live.filter((r) => r.status === "absent").length };
  }, [rows]);

  const filtered = subjectId || from || to || status !== "all";

  return (
    <>
      <PageHeader hand="flip back through" title="Attendance history" subtitle="Every class you've been marked for, newest first." />

      <Card className="mb-5 grid grid-cols-2 gap-3 p-4 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-end">
        <label className="col-span-2 block lg:col-span-1">
          <span className="mb-1 block text-xs font-semibold text-ink-500">Subject</span>
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.data?.summary.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-500">From</span>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={inputCls(false)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-500">To</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={inputCls(false)} />
        </label>
        <Button variant="ghost" className="col-span-2 lg:col-span-1" disabled={!filtered} onClick={() => { setSubjectId(""); setFrom(""); setTo(""); setStatus("all"); }}>Clear filters</Button>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented value={status} onChange={setStatus} options={[{ value: "all", label: "All" }, { value: "present", label: "Present" }, { value: "absent", label: "Absent" }]} />
        {counts && <p className="text-sm text-ink-400 tabular"><span className="font-semibold text-sage-700">{counts.present} present</span> · <span className="font-semibold text-coral-700">{counts.absent} absent</span> in this view</p>}
      </div>

      {error ? <ErrorState error={error} onRetry={reload} /> : (
        <HistoryList rows={rows} summary={subjects.data?.summary}
          emptyText={filtered ? "No classes match these filters. Try widening the dates." : undefined} />
      )}

      <Notice tone="sky" className="mt-6">
        This list shows classes that have a mark. A class that was held but never marked still counts as absent in your percentage. The register records the class time; the exact tap time is kept by your faculty.
      </Notice>
    </>
  );
}

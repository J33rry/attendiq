"use client";
import { Badge, Card, EmptyState, Skeleton, cx } from "@/components/ui/primitives";
import Icon from "@/components/ui/Icon";
import { SubjectTag } from "./SubjectCard";
import { fmtDate, fmtTime } from "@/lib/format";

const idFor = (summary, code) => summary?.find((s) => s.code === code)?.id ?? 0;

function StatusPill({ r }) {
  if (r.sessionStatus === "cancelled") return <Badge tone="ink">Cancelled · not counted</Badge>;
  return r.status === "present" ? <Badge tone="sage" dot>Present</Badge> : <Badge tone="coral" dot>Absent</Badge>;
}

const Source = ({ r }) => (
  <span className="inline-flex items-center gap-1 text-ink-400">
    <Icon name={r.source === "rfid" ? "rfid" : "pencil"} size={14} />
    {r.source === "rfid" ? "ID card tap" : "Marked by faculty"}
  </span>
);

/** Table on wide screens, stacked cards on phones. */
export default function HistoryList({ rows, summary, emptyText = "Your attendance marks will appear here after your first class." }) {
  if (!rows) return <Card className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</Card>;
  if (!rows.length) return <EmptyState icon="history" title="Nothing here yet">{emptyText}</EmptyState>;

  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-50 text-xs uppercase tracking-wider text-ink-400">
            <tr>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Subject</th>
              <th className="px-5 py-3 font-semibold">Class time</th>
              <th className="px-5 py-3 font-semibold">How it was marked</th>
              <th className="px-5 py-3 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-200">
            {rows.map((r) => (
              <tr key={r.sessionId} className={cx("transition hover:bg-paper-50", r.sessionStatus === "cancelled" && "opacity-60")}>
                <td className="whitespace-nowrap px-5 py-3.5 font-semibold">{fmtDate(r.startsAt)}</td>
                <td className="px-5 py-3.5"><span className="flex items-center gap-2"><SubjectTag id={idFor(summary, r.code)} code={r.code} />{r.subject}</span></td>
                <td className="whitespace-nowrap px-5 py-3.5 text-ink-500 tabular">{fmtTime(r.startsAt)}</td>
                <td className="px-5 py-3.5"><Source r={r} /></td>
                <td className="px-5 py-3.5 text-right"><StatusPill r={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ul className="space-y-2.5 md:hidden">
        {rows.map((r) => (
          <li key={r.sessionId}>
            <Card className={cx("flex items-center gap-3 p-3.5", r.sessionStatus === "cancelled" && "opacity-60")}>
              <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl",
                r.sessionStatus === "cancelled" ? "bg-paper-100 text-ink-400" : r.status === "present" ? "bg-sage-50 text-sage-700" : "bg-coral-50 text-coral-700")}>
                <Icon name={r.sessionStatus === "cancelled" ? "ban" : r.status === "present" ? "check" : "x"} size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.subject}</p>
                <p className="text-xs text-ink-400">{fmtDate(r.startsAt)} · {fmtTime(r.startsAt)}</p>
                <p className="mt-0.5 text-xs"><Source r={r} /></p>
              </div>
              <StatusPill r={r} />
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

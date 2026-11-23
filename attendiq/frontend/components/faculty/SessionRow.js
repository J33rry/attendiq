"use client";
import Link from "next/link";
import { dayLabel, fmtTime } from "@/lib/format";
import { cx } from "@/components/ui/primitives";
import { SessionBadge } from "./session-utils";

export default function SessionRow({ s, now, showDay }) {
  return (
    <Link href={`/faculty/sessions/${s.id}`} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-paper-50">
      <div className="w-[4.5rem] shrink-0 text-sm tabular">
        <p className="font-semibold">{showDay ? dayLabel(s.startsAt, now) : fmtTime(s.startsAt)}</p>
        <p className="text-xs text-ink-400">{showDay ? fmtTime(s.startsAt) : `to ${fmtTime(s.endsAt)}`}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cx("truncate font-semibold", s.status === "cancelled" && "text-ink-400 line-through")}>{s.subject}</p>
        <p className="truncate text-xs text-ink-400">{s.code}{s.topic ? ` · ${s.topic}` : ""}</p>
      </div>
      <SessionBadge s={s} now={now} />
    </Link>
  );
}

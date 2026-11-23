"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { facultyApi } from "@/lib/api";
import { useApi, useNow } from "@/lib/hooks";
import { fmtLongDate, fmtRange, fmtTime, plural, relative } from "@/lib/format";
import { RFID_GRACE_MINUTES } from "@/lib/config";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Notice, PageHeader, SearchInput, Skeleton, cx } from "@/components/ui/primitives";
import Icon from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import SessionForm from "@/components/faculty/SessionForm";
import { SessionBadge, scannerOpen } from "@/components/faculty/session-utils";

const POLL_MS = 5000;
const LABEL = { present: "Present", absent: "Absent", unmarked: "Not marked" };

export default function SessionRegister() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const now = useNow(5_000);
  const att = useApi(() => facultyApi.sessionAttendance(id), [id]);
  const dash = useApi(() => facultyApi.dashboard());
  const [draft, setDraft] = useState({}); // studentId -> "present" | "absent"
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // overwrites awaiting confirmation
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const session = att.data?.session;
  const roster = att.data?.roster;
  const subject = dash.data?.subjects.find((s) => s.id === session?.subjectId);
  const open = session ? scannerOpen(session, now) : false;
  const cancelled = session?.status === "cancelled";
  const notStarted = session && now < new Date(new Date(session.startsAt).getTime() - RFID_GRACE_MINUTES * 60_000);
  const locked = cancelled || notStarted;

  // While the reader is accepting taps, refresh the register quietly so RFID marks appear live.
  const { setData } = att;
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      facultyApi.sessionAttendance(id).then((d) => setData(d)).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
  }, [open, id, setData]);

  const rows = useMemo(() => {
    if (!roster) return null;
    const term = q.trim().toLowerCase();
    return roster
      .map((r) => ({ ...r, effective: draft[r.studentId] ?? r.status, changed: draft[r.studentId] && draft[r.studentId] !== r.status }))
      .filter((r) => !term || r.name.toLowerCase().includes(term) || r.rollNo.toLowerCase().includes(term));
  }, [roster, draft, q]);

  const changes = useMemo(() => roster?.filter((r) => draft[r.studentId] && draft[r.studentId] !== r.status) ?? [], [roster, draft]);
  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, unmarked: 0 };
    roster?.forEach((r) => c[draft[r.studentId] ?? r.status]++);
    return c;
  }, [roster, draft]);
  const taps = useMemo(() => (roster ?? []).filter((r) => r.source === "rfid" && r.status === "present").sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt)), [roster]);

  const mark = (sid, status) => setDraft((d) => {
    const server = roster.find((r) => r.studentId === sid)?.status;
    const next = { ...d };
    if (server === status) delete next[sid]; else next[sid] = status;
    return next;
  });
  const markRemaining = (status) => setDraft((d) => {
    const next = { ...d };
    roster.forEach((r) => { if ((d[r.studentId] ?? r.status) === "unmarked") next[r.studentId] = status; });
    return next;
  });

  function requestSave() {
    const overwrites = changes.filter((r) => r.status !== "unmarked");
    if (overwrites.length) setConfirm(overwrites);
    else save();
  }

  async function save() {
    setSaving(true);
    try {
      const records = changes.map((r) => ({ studentId: r.studentId, status: draft[r.studentId] }));
      await facultyApi.saveAttendance(id, records);
      const fresh = await facultyApi.sessionAttendance(id);
      setData(fresh);
      setDraft({});
      setConfirm(null);
      toast.success("Attendance saved", `${plural(records.length, "student's", "students'")} attendance updated for ${subject?.name ?? "this session"}.`);
    } catch (e) {
      toast.error("Attendance wasn't saved", e.message);
    } finally { setSaving(false); }
  }

  async function doCancel() {
    setBusy(true);
    try {
      await facultyApi.cancelSession(id);
      toast.success("Session cancelled", "It no longer counts towards anyone's attendance.");
      setCancelOpen(false);
      att.reload();
    } catch (e) { toast.error("Couldn't cancel the session", e.message); } finally { setBusy(false); }
  }

  if (att.error) {
    return att.error.status === 404
      ? <EmptyState icon="calendar" title="Session not found" action={<Button variant="secondary" onClick={() => router.push("/faculty/sessions")}>Back to sessions</Button>}>It may belong to another faculty member or no longer exist.</EmptyState>
      : <ErrorState error={att.error} onRetry={att.reload} />;
  }

  return (
    <div className="pb-24">
      <PageHeader back={{ href: "/faculty/sessions", label: "All sessions" }} hand={subject?.code ?? "register"}
        title={subject?.name ?? (session ? "Class session" : "…")}
        subtitle={session && <>{fmtLongDate(session.startsAt)} · {fmtRange(session.startsAt, session.endsAt)}{session.topic ? ` · ${session.topic}` : ""}</>}
        action={session && !cancelled && <>
          <Button variant="secondary" icon="pencil" onClick={() => setEditOpen(true)}>Edit</Button>
          <Button variant="dangerGhost" icon="ban" onClick={() => setCancelOpen(true)}>Cancel session</Button>
        </>} />

      {!session ? <Skeleton className="h-96" /> : (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <SessionBadge s={session} now={now} />
              <Badge tone="sage">{counts.present} present</Badge>
              <Badge tone="coral">{counts.absent} absent</Badge>
              {counts.unmarked > 0 && <Badge tone="ink">{counts.unmarked} not marked</Badge>}
            </div>

            {cancelled && <Notice tone="coral" icon="ban" className="mb-4">This session is cancelled{session.holidayId ? " for a holiday" : ""}. It doesn&apos;t count towards attendance and can&apos;t be marked.</Notice>}
            {notStarted && <Notice tone="sky" icon="clock" className="mb-4">The register opens {RFID_GRACE_MINUTES} minutes before the class starts ({relative(new Date(new Date(session.startsAt).getTime() - RFID_GRACE_MINUTES * 60_000), now)}).</Notice>}

            {roster && roster.length > 0 && (
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
                <SearchInput value={q} onChange={setQ} placeholder="Find a student" className="md:max-w-xs md:flex-1" />
                {!locked && counts.unmarked > 0 && (
                  <div className="flex flex-wrap gap-2 md:ml-auto">
                    <Button size="sm" variant="secondary" icon="check" onClick={() => markRemaining("present")}>Mark rest present</Button>
                    <Button size="sm" variant="secondary" icon="x" onClick={() => markRemaining("absent")}>Mark rest absent</Button>
                  </div>
                )}
              </div>
            )}

            {!rows ? <Skeleton className="h-72" /> : !roster.length ? (
              <EmptyState icon="users" title="No students enrolled">Nobody is enrolled in this subject yet.</EmptyState>
            ) : !rows.length ? (
              <EmptyState icon="search" title="No one matches that search" />
            ) : (
              <Card className="divide-y divide-paper-200">
                {rows.map((r) => (
                  <div key={r.studentId} className={cx("flex flex-wrap items-center gap-3 p-3.5 transition sm:flex-nowrap sm:p-4", r.changed && "bg-butter-50")}>
                    <Avatar name={r.name} tone={r.effective === "present" ? "sage" : r.effective === "absent" ? "coral" : "ink"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.name}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-400">
                        <span>{r.rollNo}</span>
                        {r.status !== "unmarked" && (
                          <span className="inline-flex items-center gap-1">
                            · <Icon name={r.source === "rfid" ? "rfid" : "pencil"} size={13} />
                            {r.source === "rfid" ? "Card tap" : "Manual"} {fmtTime(r.markedAt)}
                          </span>
                        )}
                        {r.changed && <span className="font-semibold text-butter-700">· was {LABEL[r.status].toLowerCase()}</span>}
                      </p>
                    </div>
                    <div className="ml-auto flex rounded-full bg-paper-100 p-1" role="radiogroup" aria-label={`Attendance for ${r.name}`}>
                      {["present", "absent"].map((st) => (
                        <button key={st} role="radio" aria-checked={r.effective === st} disabled={locked} onClick={() => mark(r.studentId, st)}
                          className={cx("flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition disabled:opacity-50",
                            r.effective === st
                              ? st === "present" ? "bg-sage-600 text-white shadow-soft" : "bg-coral-700 text-white shadow-soft"
                              : "text-ink-500 hover:bg-white")}>
                          <Icon name={st === "present" ? "check" : "x"} size={15} />{LABEL[st]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </Card>
            )}
            {!locked && counts.unmarked > 0 && <p className="mt-3 text-xs text-ink-400">Students left unmarked count as absent once the class has started.</p>}
          </section>

          <RfidPanel session={session} open={open} taps={taps} now={now} />
        </div>
      )}

      {/* Sticky save bar */}
      {changes.length > 0 && (
        <div className="fixed inset-x-0 bottom-[4.5rem] z-30 px-4 lg:bottom-6 lg:left-[260px]">
          <div className="mx-auto flex max-w-2xl animate-pop items-center gap-3 rounded-2xl bg-ink-900 p-3 pl-5 text-paper-50 shadow-pop">
            <p className="flex-1 text-sm"><span className="font-semibold">{plural(changes.length, "unsaved change", "unsaved changes")}</span><span className="text-paper-300 max-sm:hidden"> — nothing is saved until you press save</span></p>
            <Button size="sm" variant="ghost" className="!text-paper-200 hover:!bg-white/10" onClick={() => setDraft({})} disabled={saving}>Discard</Button>
            <Button size="sm" variant="sage" icon="check" loading={saving} onClick={requestSave}>Save attendance</Button>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={save} loading={saving} tone="primary"
        title="Change existing marks?" confirmLabel={`Save ${plural(changes.length, "change", "changes")}`}>
        <p>These students already have a mark. Saving will replace it:</p>
        <ul className="mt-3 space-y-2">
          {confirm?.map((r) => (
            <li key={r.studentId} className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 ring-1 ring-paper-300">
              <span className="truncate font-semibold">{r.name}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs">
                <Badge tone={r.status === "present" ? "sage" : "coral"}>{LABEL[r.status]}{r.source === "rfid" ? " (card)" : ""}</Badge>
                <Icon name="arrowRight" size={14} />
                <Badge tone={draft[r.studentId] === "present" ? "sage" : "coral"}>{LABEL[draft[r.studentId]]}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>

      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={doCancel} loading={busy} title="Cancel this session?" confirmLabel="Yes, cancel session">
        It will be left out of every student&apos;s attendance, and the RFID reader will reject taps for it. Cancelled sessions can&apos;t be reopened.
      </ConfirmDialog>

      {dash.data && session && (
        <SessionForm open={editOpen} onClose={() => setEditOpen(false)} subjects={dash.data.subjects} session={session} onSaved={att.reload} />
      )}
    </div>
  );
}

function RfidPanel({ session, open, taps, now }) {
  const opensAt = new Date(new Date(session.startsAt).getTime() - RFID_GRACE_MINUTES * 60_000);
  const last = taps[0];
  const cancelled = session.status === "cancelled";
  const state = cancelled ? "cancelled" : open ? "open" : now < opensAt ? "soon" : "closed";
  const S = {
    open: { tone: "sage", title: "Accepting card taps", body: `Until ${fmtTime(session.endsAt)}. This page refreshes every few seconds.` },
    soon: { tone: "sky", title: "Not open yet", body: `Taps are accepted from ${fmtTime(opensAt)}, ${RFID_GRACE_MINUTES} min before class.` },
    closed: { tone: "ink", title: "Window closed", body: "The class has ended, so new taps are rejected. You can still correct marks manually." },
    cancelled: { tone: "coral", title: "Session cancelled", body: "Taps for this session are rejected." },
  }[state];

  return (
    <aside className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-paper-200 p-4">
          <span className="relative grid size-11 place-items-center rounded-2xl bg-ink-900 text-paper-50">
            <Icon name="rfid" />
            {state === "open" && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-sage-400"><span className="absolute inset-0 animate-ping-soft rounded-full bg-sage-400" /></span>}
          </span>
          <div>
            <h2 className="font-semibold leading-tight">RFID register</h2>
            <p className="text-xs text-ink-400">Scan window for this session</p>
          </div>
        </div>
        <div className="p-4">
          <Badge tone={S.tone} dot>{S.title}</Badge>
          <p className="mt-2 text-sm text-ink-500">{S.body}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-paper-50 p-3 ring-1 ring-paper-200">
              <p className="font-display text-2xl font-semibold tabular">{taps.length}</p>
              <p className="text-xs text-ink-400">card taps accepted</p>
            </div>
            <div className="rounded-xl bg-paper-50 p-3 ring-1 ring-paper-200">
              <p className="truncate font-display text-lg font-semibold">{last ? relative(last.markedAt, now) : "—"}</p>
              <p className="text-xs text-ink-400">last tap received</p>
            </div>
          </div>
        </div>
        <div className="border-t border-paper-200 p-4">
          <h3 className="mb-2 text-sm font-semibold">Recent taps</h3>
          {!taps.length ? (
            <p className="text-sm text-ink-400">{state === "open" ? "Waiting for the first tap…" : "No card taps for this session."}</p>
          ) : (
            <ul className="space-y-2">
              {taps.slice(0, 6).map((t) => (
                <li key={t.studentId} className="flex animate-rise items-center gap-2.5 text-sm">
                  <span className="grid size-7 place-items-center rounded-lg bg-sage-50 text-sage-700"><Icon name="check" size={15} /></span>
                  <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                  <span className="text-xs text-ink-400 tabular">{fmtTime(t.markedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
      <Notice tone="sky" className="text-xs">
        This panel shows accepted taps only. It can&apos;t tell whether the reader is powered on — duplicate taps, unregistered cards and taps outside the window are rejected by the server and shown on the reader&apos;s serial log, not here.
      </Notice>
    </aside>
  );
}

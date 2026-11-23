"use client";
import { useEffect, useState } from "react";
import { facultyApi } from "@/lib/api";
import { localDateKey, localTimeKey, toISO } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, inputCls } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";

const blank = (subjects) => ({ subjectId: subjects?.[0]?.id ?? "", date: localDateKey(new Date()), start: "09:00", end: "10:00", topic: "" });

/** Create (session = null) or edit a class session. */
export default function SessionForm({ open, onClose, subjects, session, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(() => blank(subjects));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const editing = !!session;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(session
      ? { subjectId: session.subjectId, date: localDateKey(session.startsAt), start: localTimeKey(session.startsAt), end: localTimeKey(session.endsAt), topic: session.topic ?? "" }
      : blank(subjects));
  }, [open, session, subjects]);

  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  function validate() {
    const e = {};
    if (!editing && !f.subjectId) e.subjectId = "Pick a subject.";
    if (!f.date) e.date = "Pick a date.";
    if (!f.start) e.start = "Add a start time.";
    if (!f.end) e.end = "Add an end time.";
    else if (f.start && f.end <= f.start) e.end = "The class should end after it starts.";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function submit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const body = { startsAt: toISO(f.date, f.start), endsAt: toISO(f.date, f.end), topic: f.topic.trim() || null };
    try {
      const subject = subjects.find((s) => String(s.id) === String(editing ? session.subjectId : f.subjectId));
      if (editing) {
        await facultyApi.updateSession(session.id, body);
        toast.success("Session updated", `${subject?.name ?? "Class"} is now ${new Date(body.startsAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}.`);
      } else {
        const res = await facultyApi.createSession({ ...body, subjectId: Number(f.subjectId) });
        if (res.note) toast.info("Created on a holiday", res.note);
        else toast.success("Session scheduled", `${subject?.name ?? "Class"} added to the timetable. Students will see it right away.`);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(editing ? "Couldn't update the session" : "Couldn't create the session", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit session" : "Schedule a class"}
      description={editing ? "Change the time or topic. Attendance already marked stays as it is." : "Add a class to the timetable. Students can tap in from 10 minutes before it starts."}>
      <form onSubmit={submit} noValidate className="space-y-4" id="session-form">
        <Field label="Subject" error={errors.subjectId}>
          <Select value={editing ? session.subjectId : f.subjectId} onChange={set("subjectId")} disabled={editing} invalid={errors.subjectId}>
            {subjects?.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </Select>
        </Field>
        <Field label="Date" error={errors.date}>
          <input type="date" value={f.date} onChange={set("date")} className={inputCls(errors.date)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts at" error={errors.start}>
            <input type="time" value={f.start} onChange={set("start")} className={inputCls(errors.start)} />
          </Field>
          <Field label="Ends at" error={errors.end}>
            <input type="time" value={f.end} onChange={set("end")} className={inputCls(errors.end)} />
          </Field>
        </div>
        <Field label="Topic" hint="Optional — e.g. “Binary search trees”">
          <input type="text" value={f.topic} onChange={set("topic")} maxLength={200} placeholder="What's this class about?" className={inputCls(false)} />
        </Field>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="sage" loading={busy} icon={editing ? "check" : "plus"}>{editing ? "Save changes" : "Schedule class"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function HolidayForm({ open, onClose, onSaved }) {
  const toast = useToast();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setDate(""); setName(""); setErrors({}); } }, [open]);

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (!date) er.date = "Pick the holiday's date.";
    if (!name.trim()) er.name = "Give the holiday a name.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const res = await facultyApi.addHoliday(date, name.trim());
      toast.success(`${res.holiday.name} added`, res.cancelledSessions ? `${res.cancelledSessions} session(s) on that day were cancelled and won't count.` : "No sessions were scheduled that day.");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Couldn't add the holiday", err.message);
    } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Mark a holiday"
      description="Every session on this date — for all faculty — is cancelled and left out of attendance.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Date" error={errors.date}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls(errors.date)} /></Field>
        <Field label="Name" error={errors.name}><input type="text" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali" className={inputCls(errors.name)} /></Field>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy} icon="sun">Add holiday</Button>
        </div>
      </form>
    </Modal>
  );
}

import { Router } from "express";
import { z } from "zod";
import { and, asc, eq, gte, lt, sql, inArray, ne, lte } from "drizzle-orm";
import { db, schema } from "../db.js";
import { requireRole, loadProfile, wrap, httpError } from "../middleware.js";
import { statusFor, THRESHOLD_PCT } from "../services/attendanceService.js";

const { classSessions, attendance, subjects, enrollments, students, users, holidays } = schema;
const r = Router();
r.use(requireRole("faculty"), loadProfile);

async function ownSubject(req, subjectId) {
  const [s] = await db.select().from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.facultyId, req.faculty.id)));
  if (!s) throw httpError(404, "Subject not found");
  return s;
}
async function ownSession(req, id) {
  const [s] = await db.select().from(classSessions).where(and(eq(classSessions.id, id), eq(classSessions.facultyId, req.faculty.id)));
  if (!s) throw httpError(404, "Session not found");
  return s;
}
const idParam = (v) => z.coerce.number().int().positive().parse(v);

r.get("/me", wrap(async (req, res) => {
  const f = req.faculty;
  res.json({ id: f.id, name: req.user.name, email: req.user.email, employeeId: f.employeeId, department: f.department });
}));

r.get("/dashboard", wrap(async (req, res) => {
  const f = req.faculty;
  const subs = await db.select().from(subjects).where(eq(subjects.facultyId, f.id));
  const subjectsOut = [];
  for (const s of subs) subjectsOut.push({ ...s, ...(await subjectOverview(s.id)).summary });

  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86_400_000);
  const today = await db
    .select({ id: classSessions.id, startsAt: classSessions.startsAt, endsAt: classSessions.endsAt, status: classSessions.status, topic: classSessions.topic, subject: subjects.name, code: subjects.code })
    .from(classSessions).innerJoin(subjects, eq(subjects.id, classSessions.subjectId))
    .where(and(eq(classSessions.facultyId, f.id), gte(classSessions.startsAt, start), lt(classSessions.startsAt, end)))
    .orderBy(asc(classSessions.startsAt));
  const counts = await db.select({ status: classSessions.status, n: sql`count(*)::int` }).from(classSessions).where(eq(classSessions.facultyId, f.id)).groupBy(classSessions.status);
  res.json({
    profile: { name: req.user.name, email: req.user.email, employeeId: f.employeeId, department: f.department },
    threshold: THRESHOLD_PCT,
    subjects: subjectsOut, today,
    sessionCounts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
  });
}));

async function subjectOverview(subjectId, now = new Date()) {
  const roster = await db
    .select({ studentId: students.id, name: users.name, rollNo: students.rollNo })
    .from(enrollments).innerJoin(students, eq(students.id, enrollments.studentId)).innerJoin(users, eq(users.id, students.userId))
    .where(eq(enrollments.subjectId, subjectId)).orderBy(asc(students.rollNo));
  const [{ n: conducted }] = await db.select({ n: sql`count(*)::int` }).from(classSessions)
    .where(and(eq(classSessions.subjectId, subjectId), ne(classSessions.status, "cancelled"), lte(classSessions.startsAt, now)));
  const present = await db
    .select({ studentId: attendance.studentId, n: sql`count(*)::int` })
    .from(attendance).innerJoin(classSessions, eq(classSessions.id, attendance.sessionId))
    .where(and(eq(classSessions.subjectId, subjectId), eq(attendance.status, "present"), ne(classSessions.status, "cancelled"), lte(classSessions.startsAt, now)))
    .groupBy(attendance.studentId);
  const pm = Object.fromEntries(present.map((p) => [p.studentId, p.n]));
  const studentsOut = roster.map((s) => ({ ...s, attended: pm[s.studentId] ?? 0, conducted, ...statusFor(pm[s.studentId] ?? 0, conducted) }));
  const avg = studentsOut.length ? Math.round((studentsOut.reduce((a, s) => a + s.percentage, 0) / studentsOut.length) * 100) / 100 : 0;
  return {
    students: studentsOut,
    summary: { enrolled: roster.length, conducted, averagePercentage: avg, belowThreshold: studentsOut.filter((s) => !s.eligible).length },
  };
}

r.get("/subjects/:id/students", wrap(async (req, res) => {
  const s = await ownSubject(req, idParam(req.params.id));
  res.json({ subject: s, ...(await subjectOverview(s.id)) });
}));

// ---- sessions ----
const sessionBody = z.object({
  subjectId: z.coerce.number().int().positive(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  topic: z.string().max(200).optional().nullable(),
}).refine((b) => b.endsAt > b.startsAt, { message: "endsAt must be after startsAt", path: ["endsAt"] });

async function holidayFor(date) {
  const d = date.toISOString().slice(0, 10);
  const [h] = await db.select().from(holidays).where(eq(holidays.date, d));
  return h;
}

r.get("/sessions", wrap(async (req, res) => {
  const q = z.object({
    subjectId: z.coerce.number().int().optional(),
    status: z.enum(["scheduled", "conducted", "cancelled"]).optional(),
    from: z.coerce.date().optional(), to: z.coerce.date().optional(),
  }).parse(req.query);
  const conds = [eq(classSessions.facultyId, req.faculty.id)];
  if (q.subjectId) conds.push(eq(classSessions.subjectId, q.subjectId));
  if (q.status) conds.push(eq(classSessions.status, q.status));
  if (q.from) conds.push(gte(classSessions.startsAt, q.from));
  if (q.to) conds.push(lt(classSessions.startsAt, q.to));
  const rows = await db
    .select({ id: classSessions.id, subjectId: classSessions.subjectId, startsAt: classSessions.startsAt, endsAt: classSessions.endsAt, status: classSessions.status, topic: classSessions.topic, holidayId: classSessions.holidayId, subject: subjects.name, code: subjects.code })
    .from(classSessions).innerJoin(subjects, eq(subjects.id, classSessions.subjectId))
    .where(and(...conds)).orderBy(asc(classSessions.startsAt));
  res.json({ sessions: rows });
}));

r.post("/sessions", wrap(async (req, res) => {
  const b = sessionBody.parse(req.body);
  await ownSubject(req, b.subjectId);
  const h = await holidayFor(b.startsAt);
  const [row] = await db.insert(classSessions).values({
    subjectId: b.subjectId, facultyId: req.faculty.id, startsAt: b.startsAt, endsAt: b.endsAt, topic: b.topic ?? null,
    status: h ? "cancelled" : "scheduled", holidayId: h?.id ?? null,
  }).returning();
  res.status(201).json({ session: row, note: h ? `Falls on holiday "${h.name}"; created as cancelled.` : undefined });
}));

r.patch("/sessions/:id", wrap(async (req, res) => {
  const s = await ownSession(req, idParam(req.params.id));
  const b = z.object({
    startsAt: z.coerce.date().optional(), endsAt: z.coerce.date().optional(),
    topic: z.string().max(200).nullable().optional(),
    status: z.enum(["scheduled", "conducted"]).optional(),
  }).parse(req.body);
  if (s.status === "cancelled" && b.status) throw httpError(409, "Cancelled sessions cannot be re-opened");
  const startsAt = b.startsAt ?? s.startsAt, endsAt = b.endsAt ?? s.endsAt;
  if (endsAt <= startsAt) throw httpError(400, "endsAt must be after startsAt");
  const [row] = await db.update(classSessions).set({ ...b, startsAt, endsAt }).where(eq(classSessions.id, s.id)).returning();
  res.json({ session: row });
}));

r.post("/sessions/:id/cancel", wrap(async (req, res) => {
  const s = await ownSession(req, idParam(req.params.id));
  const [row] = await db.update(classSessions).set({ status: "cancelled" }).where(eq(classSessions.id, s.id)).returning();
  res.json({ session: row });
}));

// ---- per-session attendance ----
r.get("/sessions/:id/attendance", wrap(async (req, res) => {
  const s = await ownSession(req, idParam(req.params.id));
  const roster = await db
    .select({ studentId: students.id, name: users.name, rollNo: students.rollNo, status: attendance.status, source: attendance.source, markedAt: attendance.markedAt })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId)).innerJoin(users, eq(users.id, students.userId))
    .leftJoin(attendance, and(eq(attendance.studentId, students.id), eq(attendance.sessionId, s.id)))
    .where(eq(enrollments.subjectId, s.subjectId)).orderBy(asc(students.rollNo));
  res.json({ session: s, roster: roster.map((x) => ({ ...x, status: x.status ?? "unmarked" })) });
}));

r.put("/sessions/:id/attendance/:studentId", wrap(async (req, res) => {
  const s = await ownSession(req, idParam(req.params.id));
  const studentId = idParam(req.params.studentId);
  const { status } = z.object({ status: z.enum(["present", "absent"]) }).parse(req.body);
  if (s.status === "cancelled") throw httpError(409, "Cannot mark attendance for a cancelled session");
  const [enr] = await db.select().from(enrollments).where(and(eq(enrollments.studentId, studentId), eq(enrollments.subjectId, s.subjectId)));
  if (!enr) throw httpError(404, "Student is not enrolled in this subject");
  const [row] = await db.insert(attendance).values({ sessionId: s.id, studentId, status, source: "manual" })
    .onConflictDoUpdate({ target: [attendance.sessionId, attendance.studentId], set: { status, source: "manual", markedAt: new Date() } }).returning();
  if (s.status === "scheduled") await db.update(classSessions).set({ status: "conducted" }).where(eq(classSessions.id, s.id));
  res.json({ attendance: row });
}));

r.put("/sessions/:id/attendance", wrap(async (req, res) => {
  // bulk: [{studentId, status}]
  const s = await ownSession(req, idParam(req.params.id));
  const { records } = z.object({ records: z.array(z.object({ studentId: z.number().int(), status: z.enum(["present", "absent"]) })).min(1) }).parse(req.body);
  if (s.status === "cancelled") throw httpError(409, "Cannot mark attendance for a cancelled session");
  const enrolled = await db.select({ id: enrollments.studentId }).from(enrollments).where(eq(enrollments.subjectId, s.subjectId));
  const ok = new Set(enrolled.map((e) => e.id));
  const bad = records.filter((x) => !ok.has(x.studentId));
  if (bad.length) throw httpError(400, `Not enrolled: ${bad.map((b) => b.studentId).join(", ")}`);
  await db.transaction(async (tx) => {
    for (const x of records) {
      await tx.insert(attendance).values({ sessionId: s.id, studentId: x.studentId, status: x.status, source: "manual" })
        .onConflictDoUpdate({ target: [attendance.sessionId, attendance.studentId], set: { status: x.status, source: "manual", markedAt: new Date() } });
    }
    if (s.status === "scheduled") await tx.update(classSessions).set({ status: "conducted" }).where(eq(classSessions.id, s.id));
  });
  res.json({ updated: records.length });
}));

// ---- holidays ----
r.post("/holidays", wrap(async (req, res) => {
  const b = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), name: z.string().min(1).max(100) }).parse(req.body);
  const [h] = await db.insert(holidays).values(b).onConflictDoNothing().returning();
  if (!h) throw httpError(409, "A holiday already exists on that date");
  const cancelled = await db.update(classSessions).set({ status: "cancelled", holidayId: h.id })
    .where(sql`${classSessions.startsAt}::date = ${b.date}::date`).returning({ id: classSessions.id });
  res.status(201).json({ holiday: h, cancelledSessions: cancelled.length });
}));

export default r;

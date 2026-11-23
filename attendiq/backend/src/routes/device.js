import { Router } from "express";
import { z } from "zod";
import { and, eq, inArray, lte, gte, ne, asc } from "drizzle-orm";
import { db, schema } from "../db.js";
import { deviceAuth, wrap } from "../middleware.js";

const { students, users, enrollments, classSessions, attendance, subjects } = schema;
const r = Router();
const GRACE_MS = 10 * 60_000; // cards accepted 10 min before start

r.post("/scan", deviceAuth, wrap(async (req, res) => {
  const body = z.object({
    uid: z.string().min(4).max(32).transform((s) => s.trim().toUpperCase()),
    sessionId: z.coerce.number().int().positive().optional(),
  }).parse(req.body);

  const [stu] = await db.select({ id: students.id, name: users.name, rollNo: students.rollNo })
    .from(students).innerJoin(users, eq(users.id, students.userId)).where(eq(students.rfidUid, body.uid));
  if (!stu) return res.status(404).json({ ok: false, code: "CARD_NOT_REGISTERED", error: "Card is not registered" });

  const subs = await db.select({ id: enrollments.subjectId }).from(enrollments).where(eq(enrollments.studentId, stu.id));
  const subjectIds = subs.map((s) => s.id);
  const now = new Date();

  let session;
  if (body.sessionId) {
    [session] = await db.select().from(classSessions).where(eq(classSessions.id, body.sessionId));
    if (!session) return res.status(404).json({ ok: false, code: "SESSION_NOT_FOUND", error: "Session not found" });
  } else if (subjectIds.length) {
    const rows = await db.select().from(classSessions).where(and(
      inArray(classSessions.subjectId, subjectIds),
      lte(classSessions.startsAt, new Date(now.getTime() + GRACE_MS)),
      gte(classSessions.endsAt, now),
    )).orderBy(asc(classSessions.startsAt));
    session = rows.find((s) => s.status !== "cancelled") ?? rows[0];
  }
  if (!session) return res.status(404).json({ ok: false, code: "NO_ACTIVE_SESSION", error: "No active class session for this student" });

  if (session.status === "cancelled")
    return res.status(409).json({ ok: false, code: "SESSION_CANCELLED", error: "This session is cancelled" });
  if (!subjectIds.includes(session.subjectId))
    return res.status(403).json({ ok: false, code: "NOT_ENROLLED", error: "Student is not enrolled in this subject" });
  if (now < new Date(session.startsAt.getTime() - GRACE_MS) || now > session.endsAt)
    return res.status(409).json({ ok: false, code: "OUTSIDE_SESSION_WINDOW", error: "Session is not currently running" });

  const [row] = await db.insert(attendance).values({ sessionId: session.id, studentId: stu.id, status: "present", source: "rfid" })
    .onConflictDoNothing().returning();
  if (!row) return res.status(409).json({ ok: false, code: "DUPLICATE", error: "Attendance already recorded", student: stu.name });

  if (session.status === "scheduled") await db.update(classSessions).set({ status: "conducted" }).where(eq(classSessions.id, session.id));
  const [sub] = await db.select({ name: subjects.name }).from(subjects).where(eq(subjects.id, session.subjectId));
  res.status(201).json({ ok: true, student: stu.name, rollNo: stu.rollNo, subject: sub.name, sessionId: session.id, status: "present" });
}));

export default r;

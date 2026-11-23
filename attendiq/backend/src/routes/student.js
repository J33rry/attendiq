import { Router } from "express";
import { z } from "zod";
import { and, asc, desc, eq, gt, inArray, ne } from "drizzle-orm";
import { db, schema } from "../db.js";
import { requireRole, loadProfile, wrap, httpError } from "../middleware.js";
import { subjectStats, overall, THRESHOLD_PCT } from "../services/attendanceService.js";
import { bunkPlan, recoveryPlan } from "../services/plannerService.js";
import { askAssistant } from "../services/assistant/groqAssistant.js";
import { screenInput, sanitizeHistory, rateLimit, REFUSAL, LIMITS } from "../services/assistant/guardrails.js";

const { classSessions, attendance, subjects, enrollments, students, users } = schema;
const r = Router();
r.use(requireRole("student"), loadProfile);

async function profile(req) {
  const s = req.student;
  return { id: s.id, name: req.user.name, email: req.user.email, rollNo: s.rollNo, department: s.department, semester: s.semester, rfidRegistered: !!s.rfidUid };
}

async function upcoming(studentId, limit = 8) {
  const subs = await db.select({ id: enrollments.subjectId }).from(enrollments).where(eq(enrollments.studentId, studentId));
  if (!subs.length) return [];
  return db
    .select({ id: classSessions.id, startsAt: classSessions.startsAt, endsAt: classSessions.endsAt, topic: classSessions.topic, subject: subjects.name, code: subjects.code })
    .from(classSessions)
    .innerJoin(subjects, eq(subjects.id, classSessions.subjectId))
    .where(and(inArray(classSessions.subjectId, subs.map((s) => s.id)), ne(classSessions.status, "cancelled"), gt(classSessions.startsAt, new Date())))
    .orderBy(asc(classSessions.startsAt))
    .limit(limit);
}

r.get("/me", wrap(async (req, res) => res.json(await profile(req))));

r.get("/dashboard", wrap(async (req, res) => {
  const stats = await subjectStats(req.student.id);
  res.json({ profile: await profile(req), threshold: THRESHOLD_PCT, overall: overall(stats), subjects: stats, upcoming: await upcoming(req.student.id) });
}));

r.get("/attendance", wrap(async (req, res) => {
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : null;
  const conds = [eq(attendance.studentId, req.student.id)];
  if (subjectId) conds.push(eq(classSessions.subjectId, subjectId));
  const history = await db
    .select({ sessionId: classSessions.id, startsAt: classSessions.startsAt, sessionStatus: classSessions.status, status: attendance.status, source: attendance.source, subject: subjects.name, code: subjects.code })
    .from(attendance)
    .innerJoin(classSessions, eq(classSessions.id, attendance.sessionId))
    .innerJoin(subjects, eq(subjects.id, classSessions.subjectId))
    .where(and(...conds))
    .orderBy(desc(classSessions.startsAt));
  res.json({ summary: await subjectStats(req.student.id), history });
}));

r.get("/planner/bunk", wrap(async (req, res) => {
  const { skip, subjectId } = z.object({
    skip: z.coerce.number().int().min(1).max(200).default(1),
    subjectId: z.coerce.number().int().optional(),
  }).parse(req.query);
  let stats = await subjectStats(req.student.id);
  if (subjectId) stats = stats.filter((s) => s.id === subjectId);
  res.json({ threshold: THRESHOLD_PCT, plans: stats.map((s) => bunkPlan(s, skip)) });
}));

r.get("/planner/recovery", wrap(async (req, res) => {
  const stats = await subjectStats(req.student.id);
  res.json({ threshold: THRESHOLD_PCT, plans: stats.filter((s) => !s.eligible).map(recoveryPlan), allClear: stats.every((s) => s.eligible) });
}));

r.post("/assistant", wrap(async (req, res) => {
  const { question, history } = z.object({
    question: z.string().trim().min(1).max(LIMITS.questionChars),
    history: z.array(z.object({ role: z.string(), content: z.string() })).max(20).optional(),
  }).parse(req.body);

  const limit = rateLimit(req.user.id);
  if (!limit.ok) {
    res.set("retry-after", String(limit.retryAfterSec));
    throw httpError(429, `Too many questions. Try again in ${limit.retryAfterSec}s.`);
  }
  const screened = screenInput(question);
  if (!screened.ok) return res.json({ intent: "refused", answer: REFUSAL, source: "guardrail" });

  res.json(await askAssistant({
    question: screened.question,
    history: sanitizeHistory(history),
    student: req.student,
    user: req.user,
    stats: await subjectStats(req.student.id),
  }));
}));

export default r;

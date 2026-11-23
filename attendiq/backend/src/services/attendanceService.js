import { and, eq, ne, lte, gt, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db.js";

const { classSessions, attendance, enrollments, subjects } = schema;
// Minimum attendance percentage. Set ATTENDANCE_THRESHOLD in .env (e.g. 75); every
// calculation, message and API response reads it from here.
const configured = Number(process.env.ATTENDANCE_THRESHOLD ?? 75);
if (!(configured > 0 && configured < 100)) throw new Error("ATTENDANCE_THRESHOLD must be a number between 0 and 100");
export const THRESHOLD_PCT = configured;
export const THRESHOLD = configured / 100;

export const pct = (a, c) => (c === 0 ? 100 : Math.round((a / c) * 10000) / 100);

export function statusFor(attended, conducted) {
  const p = pct(attended, conducted);
  return { percentage: p, eligible: p >= THRESHOLD * 100 };
}

/**
 * Per-subject stats for a student. "Conducted" = non-cancelled sessions whose start has passed.
 * Cancelled sessions are excluded. A conducted session with no 'present' record counts as absent.
 */
export async function subjectStats(studentId, now = new Date()) {
  const rows = await db
    .select({ id: subjects.id, code: subjects.code, name: subjects.name })
    .from(enrollments)
    .innerJoin(subjects, eq(subjects.id, enrollments.subjectId))
    .where(eq(enrollments.studentId, studentId));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);

  const conductedRows = await db
    .select({ subjectId: classSessions.subjectId, n: sql`count(*)::int` })
    .from(classSessions)
    .where(and(inArray(classSessions.subjectId, ids), ne(classSessions.status, "cancelled"), lte(classSessions.startsAt, now)))
    .groupBy(classSessions.subjectId);
  const upcomingRows = await db
    .select({ subjectId: classSessions.subjectId, n: sql`count(*)::int` })
    .from(classSessions)
    .where(and(inArray(classSessions.subjectId, ids), ne(classSessions.status, "cancelled"), gt(classSessions.startsAt, now)))
    .groupBy(classSessions.subjectId);
  const attendedRows = await db
    .select({ subjectId: classSessions.subjectId, n: sql`count(*)::int` })
    .from(attendance)
    .innerJoin(classSessions, eq(classSessions.id, attendance.sessionId))
    .where(and(
      eq(attendance.studentId, studentId),
      eq(attendance.status, "present"),
      inArray(classSessions.subjectId, ids),
      ne(classSessions.status, "cancelled"),
      lte(classSessions.startsAt, now),
    ))
    .groupBy(classSessions.subjectId);

  const m = (arr) => Object.fromEntries(arr.map((r) => [r.subjectId, r.n]));
  const conducted = m(conductedRows), upcoming = m(upcomingRows), attended = m(attendedRows);
  return rows.map((s) => {
    const c = conducted[s.id] ?? 0, a = attended[s.id] ?? 0;
    return { ...s, attended: a, conducted: c, upcoming: upcoming[s.id] ?? 0, ...statusFor(a, c) };
  });
}

export function overall(stats) {
  const a = stats.reduce((x, s) => x + s.attended, 0);
  const c = stats.reduce((x, s) => x + s.conducted, 0);
  return { attended: a, conducted: c, ...statusFor(a, c) };
}

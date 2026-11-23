import { sql } from "drizzle-orm";
import { readDb } from "../../db.js";

/**
 * Read-only SQL access for the LLM.
 *
 * Layers of protection (any one failing is enough to block a write or a data leak):
 *  1. Static validation: a single SELECT, no comments / semicolons / dollar quotes,
 *     no write or DDL keywords, no system functions or catalogs.
 *  2. Scoping: the query may only reference the `my_*` views below, which are CTEs
 *     filtered to the logged-in student. Base tables (users, auth_sessions, ...) are rejected.
 *  3. Execution in a `READ ONLY` transaction with a statement timeout, always rolled back.
 *  4. Optional separate connection (ASSISTANT_DATABASE_URL) using a Postgres role that
 *     only has SELECT grants — see README.
 *  5. Row cap on the result.
 */

export const MAX_ROWS = 100;
const TIMEOUT_MS = 3000;

/** Views the LLM can query. Every one is filtered to the current student. */
export const VIEWS = {
  my_profile: "roll_no, department, semester, name, rfid_registered (boolean)",
  my_subjects: "subject_id, code, name, faculty_name",
  my_sessions: "session_id, subject_id, subject_code, subject_name, topic, starts_at, ends_at, status ('scheduled'|'conducted'|'cancelled'), holiday_name",
  my_attendance: "session_id, subject_id, subject_code, subject_name, starts_at, session_status, status ('present'|'absent'), source ('rfid'|'manual'), marked_at",
  holidays_list: "date, name",
};

const scopedCtes = (studentId) => sql`
WITH
my_profile AS (
  SELECT s.roll_no, s.department, s.semester, u.name, (s.rfid_uid IS NOT NULL) AS rfid_registered
  FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = ${studentId}
),
my_subjects AS (
  SELECT sub.id AS subject_id, sub.code, sub.name, fu.name AS faculty_name
  FROM enrollments e
  JOIN subjects sub ON sub.id = e.subject_id
  JOIN faculty f ON f.id = sub.faculty_id
  JOIN users fu ON fu.id = f.user_id
  WHERE e.student_id = ${studentId}
),
my_sessions AS (
  SELECT cs.id AS session_id, cs.subject_id, ms.code AS subject_code, ms.name AS subject_name, cs.topic,
         cs.starts_at, cs.ends_at, cs.status, h.name AS holiday_name
  FROM class_sessions cs
  JOIN my_subjects ms ON ms.subject_id = cs.subject_id
  LEFT JOIN holidays h ON h.id = cs.holiday_id
),
my_attendance AS (
  SELECT a.session_id, ms.subject_id, ms.subject_code, ms.subject_name, ms.starts_at, ms.status AS session_status,
         a.status, a.source, a.marked_at
  FROM attendance a JOIN my_sessions ms ON ms.session_id = a.session_id
  WHERE a.student_id = ${studentId}
),
holidays_list AS (SELECT date, name FROM holidays)
`;

const BASE_TABLES = ["users", "auth_sessions", "students", "faculty", "subjects", "enrollments", "holidays", "class_sessions", "attendance"];
const FORBIDDEN_KEYWORDS = [
  "insert", "update", "delete", "merge", "upsert", "drop", "alter", "create", "truncate", "grant", "revoke",
  "copy", "call", "do", "execute", "prepare", "deallocate", "listen", "notify", "unlisten", "vacuum", "analyze",
  "cluster", "reindex", "lock", "set", "reset", "discard", "comment", "security", "into", "refresh", "import",
  "load", "checkpoint", "begin", "commit", "rollback", "savepoint", "release", "returning", "share", "nowait",
];
const FORBIDDEN_PATTERNS = [
  /\bpg_\w*/i, /\binformation_schema\b/i, /\bpublic\s*\./i, /\bcurrent_setting\b/i, /\bset_config\b/i,
  /\blo_\w+/i, /\bdblink\w*/i, /\b(query|table|cursor|schema|database)_to_\w+/i, /\btxid_\w+/i,
  /\breg(class|proc|procedure|oper|operator|type|namespace|role|config|dictionary)\b/i,
  /\b(current_user|session_user|current_role|current_database|current_schemas?|inet_\w+|version)\b/i,
  /\bgenerate_series\b/i, /\brepeat\b/i, /\bsleep\b/i, /\bts_stat\b/i, /\bxpath\w*/i,
];

export class QueryRejected extends Error {}

/** Throws QueryRejected with a short, model-readable reason when the query is not allowed. */
export function validateQuery(input) {
  if (typeof input !== "string") throw new QueryRejected("query must be a string");
  const q = input.trim().replace(/;\s*$/, "");
  if (!q) throw new QueryRejected("query is empty");
  if (q.length > 2000) throw new QueryRejected("query is too long (max 2000 characters)");
  if (!/^select\b/i.test(q)) throw new QueryRejected("only a single SELECT statement is allowed (no WITH, it is added for you)");
  if (/;|--|\/\*|\*\/|\$|\\/.test(q)) throw new QueryRejected("semicolons, comments, '$' and backslashes are not allowed");

  // Check identifiers/keywords outside string literals.
  const code = q.replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, (m) => m.toLowerCase().replace(/"/g, ""));
  const words = new Set(code.toLowerCase().match(/[a-z_][a-z0-9_]*/g) || []);
  for (const kw of FORBIDDEN_KEYWORDS) if (words.has(kw)) throw new QueryRejected(`keyword '${kw.toUpperCase()}' is not allowed (read-only)`);
  for (const t of BASE_TABLES) if (words.has(t)) throw new QueryRejected(`table '${t}' is not accessible; use the my_* views`);
  for (const p of FORBIDDEN_PATTERNS) if (p.test(code)) throw new QueryRejected("system functions and catalogs are not allowed");
  if (![...Object.keys(VIEWS)].some((v) => words.has(v))) throw new QueryRejected(`query must read from one of: ${Object.keys(VIEWS).join(", ")}`);
  return q;
}

const rowsOf = (r) => (Array.isArray(r) ? r : r?.rows ?? []);

/** Validate and run an LLM-written SELECT scoped to `studentId`. Never commits. */
export async function runReadOnlyQuery(studentId, query) {
  const q = validateQuery(query);
  const ROLLBACK = Symbol("rollback");
  let rows;
  try {
    await readDb.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION READ ONLY`);
      await tx.execute(sql.raw(`SET LOCAL statement_timeout = ${TIMEOUT_MS}`));
      const res = await tx.execute(sql`${scopedCtes(studentId)} SELECT * FROM (${sql.raw(q)}) AS llm_q LIMIT ${MAX_ROWS + 1}`);
      rows = rowsOf(res);
      throw ROLLBACK; // never commit anything, even though the transaction is read-only
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
  const truncated = rows.length > MAX_ROWS;
  return { rows: rows.slice(0, MAX_ROWS), rowCount: Math.min(rows.length, MAX_ROWS), truncated };
}

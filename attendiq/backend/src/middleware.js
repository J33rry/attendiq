import crypto from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db, schema } from "./db.js";
import { ZodError } from "zod";

export const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");
export const COOKIE = "attendiq_session";
export const SESSION_MS = 1000 * 60 * 60 * 12;

export async function loadUser(req, _res, next) {
  try {
    const raw = req.cookies?.[COOKIE];
    if (raw) {
      const [row] = await db
        .select({ user: schema.users, exp: schema.authSessions.expiresAt })
        .from(schema.authSessions)
        .innerJoin(schema.users, eq(schema.users.id, schema.authSessions.userId))
        .where(and(eq(schema.authSessions.token, hashToken(raw)), gt(schema.authSessions.expiresAt, new Date())));
      if (row) req.user = row.user;
    }
    next();
  } catch (e) { next(e); }
}

export const requireAuth = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: "Not authenticated" });

export const requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
  next();
};

/** Resolves req.student / req.faculty profile rows. */
export async function loadProfile(req, res, next) {
  try {
    if (req.user.role === "student") {
      [req.student] = await db.select().from(schema.students).where(eq(schema.students.userId, req.user.id));
      if (!req.student) return res.status(403).json({ error: "No student profile" });
    } else {
      [req.faculty] = await db.select().from(schema.faculty).where(eq(schema.faculty.userId, req.user.id));
      if (!req.faculty) return res.status(403).json({ error: "No faculty profile" });
    }
    next();
  } catch (e) { next(e); }
}

export function deviceAuth(req, res, next) {
  const key = process.env.DEVICE_API_KEY;
  const given = req.get("x-device-key") || "";
  const ok = key && given.length === key.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(key));
  if (!ok) return res.status(401).json({ error: "Invalid device key" });
  next();
}

export const parse = (schemaObj, data) => schemaObj.parse(data);

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

export const httpError = (status, message) => Object.assign(new Error(message), { status });
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

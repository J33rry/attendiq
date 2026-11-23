import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db.js";
import { COOKIE, SESSION_MS, hashToken, requireAuth, wrap, httpError } from "../middleware.js";

const r = Router();
const loginBody = z.object({ email: z.string().email(), password: z.string().min(1) });
const DUMMY = bcrypt.hashSync("dummy-password", 10);

// Basic in-memory throttle: 10 failed attempts / 15 min per email+ip.
const fails = new Map();
const keyOf = (req, email) => `${req.ip}|${email}`;

r.post("/login", wrap(async (req, res) => {
  const { email, password } = loginBody.parse(req.body);
  const key = keyOf(req, email.toLowerCase());
  const f = fails.get(key);
  if (f && f.n >= 10 && Date.now() - f.t < 15 * 60_000) throw httpError(429, "Too many attempts, try later");

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY);
  if (!user || !ok) {
    fails.set(key, { n: (f && Date.now() - f.t < 15 * 60_000 ? f.n : 0) + 1, t: Date.now() });
    throw httpError(401, "Invalid email or password");
  }
  fails.delete(key);

  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(schema.authSessions).values({ token: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + SESSION_MS) });
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_MS, path: "/",
  });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

r.post("/logout", wrap(async (req, res) => {
  const raw = req.cookies?.[COOKIE];
  if (raw) await db.delete(schema.authSessions).where(eq(schema.authSessions.token, hashToken(raw)));
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ ok: true });
}));

r.get("/me", requireAuth, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ user: { id, name, email, role } });
});

export default r;

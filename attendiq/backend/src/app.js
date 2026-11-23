import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "./db.js";
import { loadUser, requireAuth, errorHandler, wrap } from "./middleware.js";
import auth from "./routes/auth.js";
import student from "./routes/student.js";
import faculty from "./routes/faculty.js";
import device from "./routes/device.js";

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(loadUser);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", auth);
app.use("/api/student", student);
app.use("/api/faculty", faculty);
app.use("/api/device", device);
app.get("/api/holidays", requireAuth, wrap(async (_req, res) => {
  res.json({ holidays: await db.select().from(schema.holidays).orderBy(asc(schema.holidays.date)) });
}));

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);
export default app;

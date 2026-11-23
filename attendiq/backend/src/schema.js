import { pgTable, serial, integer, text, timestamp, date, unique, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'student' | 'faculty'
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authSessions = pgTable("auth_sessions", {
  token: text("token").primaryKey(), // sha256 of cookie value
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  rollNo: text("roll_no").notNull().unique(),
  department: text("department").notNull(),
  semester: integer("semester").notNull(),
  rfidUid: text("rfid_uid").unique(),
});

export const faculty = pgTable("faculty", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().unique(),
  department: text("department").notNull(),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  facultyId: integer("faculty_id").notNull().references(() => faculty.id),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
}, (t) => [unique("enrollment_unique").on(t.studentId, t.subjectId)]);

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  name: text("name").notNull(),
});

export const classSessions = pgTable("class_sessions", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  facultyId: integer("faculty_id").notNull().references(() => faculty.id),
  topic: text("topic"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled | conducted | cancelled
  holidayId: integer("holiday_id").references(() => holidays.id, { onDelete: "set null" }),
}, (t) => [index("sessions_subject_idx").on(t.subjectId, t.startsAt)]);

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => classSessions.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // present | absent
  source: text("source").notNull().default("manual"), // rfid | manual
  reason: text("reason"), // optional note from faculty when marking manually (e.g. "Medical leave")
  markedAt: timestamp("marked_at").defaultNow().notNull(),
}, (t) => [unique("attendance_unique").on(t.sessionId, t.studentId)]);

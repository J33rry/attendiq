import bcrypt from "bcryptjs";
import { db, schema, closeDb } from "./db.js";

const {
    users,
    students,
    faculty,
    subjects,
    enrollments,
    classSessions,
    attendance,
    holidays,
} = schema;
const hash = (p) => bcrypt.hashSync(p, 10);
const DEMO_PASSWORD = "password123";

export async function seedDemo() {
    // 3 teachers, each teaching one subject
    const teachers = [
        ["Dr. Meera Iyer", "EMP001", "CS101", "Data Structures"],
        ["Prof. Arjun Nair", "EMP002", "CS102", "Operating Systems"],
        ["Dr. Kavita Rao", "EMP003", "CS103", "Computer Networks"],
    ];
    const subs = [];
    for (const [i, [name, empId, code, subName]] of teachers.entries()) {
        const [fu] = await db
            .insert(users)
            .values({
                role: "faculty",
                email: `faculty${i + 1}@attendiq.dev`,
                name,
                passwordHash: hash(DEMO_PASSWORD),
            })
            .returning();
        const [fac] = await db
            .insert(faculty)
            .values({ userId: fu.id, employeeId: empId, department: "CSE" })
            .returning();
        const [sub] = await db
            .insert(subjects)
            .values({ code, name: subName, facultyId: fac.id })
            .returning();
        subs.push(sub);
    }

    const people = [
        ["Aarav Sharma", "21CS001", "06:51:E6:06", 0.9],
        ["Diya Patel", "21CS002", "04:A1:B2:C4", 0.8],
        ["Rohan Gupta", "21CS003", "04:A1:B2:C5", 0.6],
        ["Sneha Reddy", "21CS004", "92:D9:6C:06", 0.72],
    ];
    const stu = [];
    for (const [name, roll, uid] of people) {
        const [u] = await db
            .insert(users)
            .values({
                role: "student",
                email: `${roll.toLowerCase()}@attendiq.dev`,
                name,
                passwordHash: hash(DEMO_PASSWORD),
            })
            .returning();
        const [s] = await db
            .insert(students)
            .values({
                userId: u.id,
                rollNo: roll,
                department: "CSE",
                semester: 3,
                rfidUid: uid,
            })
            .returning();
        stu.push(s);
        await db
            .insert(enrollments)
            .values(
                subs.map((sub) => ({ studentId: s.id, subjectId: sub.id })),
            );
    }

    // 4 weeks of past classes + 2 weeks upcoming; one holiday
    const day = 86_400_000,
        now = Date.now();
    const hol = new Date(now - 10 * day).toISOString().slice(0, 10);
    const [h] = await db
        .insert(holidays)
        .values({ date: hol, name: "Institute Foundation Day" })
        .returning();
    let k = 0;
    for (let d = -28; d <= 14; d++) {
        const base = new Date(now + d * day);
        const dow = base.getUTCDay();
        if (dow === 0 || dow === 6) continue;
        for (const [i, sub] of subs.entries()) {
            const startsAt = new Date(
                Date.UTC(
                    base.getUTCFullYear(),
                    base.getUTCMonth(),
                    base.getUTCDate(),
                    4 + i * 2,
                    0,
                ),
            );
            const isHol = startsAt.toISOString().slice(0, 10) === hol;
            const past = startsAt.getTime() < now;
            const [sess] = await db
                .insert(classSessions)
                .values({
                    subjectId: sub.id,
                    facultyId: sub.facultyId,
                    startsAt,
                    endsAt: new Date(startsAt.getTime() + 3_600_000),
                    topic: `Lecture ${++k}`,
                    status: isHol
                        ? "cancelled"
                        : past
                          ? "conducted"
                          : "scheduled",
                    holidayId: isHol ? h.id : null,
                })
                .returning();
            if (past && !isHol) {
                for (const [si, s] of stu.entries()) {
                    const present =
                        ((k * 7 + si * 13) % 100) / 100 < people[si][3];
                    await db.insert(attendance).values({
                        sessionId: sess.id,
                        studentId: s.id,
                        status: present ? "present" : "absent",
                        source: present ? "rfid" : "manual",
                    });
                }
            }
        }
    }
}

if (
    process.argv[1] &&
    import.meta.url.endsWith(process.argv[1].split("/").pop())
) {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`TRUNCATE users, holidays RESTART IDENTITY CASCADE`);
    await seedDemo();
    console.log(
        `Seeded. Logins: faculty1-3@attendiq.dev / 21cs001@attendiq.dev … (password: ${DEMO_PASSWORD})`,
    );
    await closeDb();
}

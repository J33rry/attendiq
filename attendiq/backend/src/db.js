import "dotenv/config";
import * as schema from "./schema.js";

let db, pool, pg, readDb, readPool;

async function connect(url) {
  if (/neon\.tech/.test(url)) {
    // Neon: serverless driver over WebSockets (supports transactions).
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    neonConfig.webSocketConstructor = (await import("ws")).default;
    const p = new Pool({ connectionString: url });
    return { pool: p, db: drizzle(p, { schema }) };
  }
  // Any other Postgres (e.g. local Docker): plain node-postgres.
  const { default: pgLib } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const p = new pgLib.Pool({ connectionString: url });
  return { pool: p, db: drizzle(p, { schema }) };
}

if (process.env.NODE_ENV === "test" || (!process.env.DATABASE_URL && process.env.USE_PGLITE === "1")) {
  // In-process Postgres (WASM) for tests / offline dev.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  pg = new PGlite();
  db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
} else {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  ({ db, pool } = await connect(url));
}

// Connection used by the AI assistant's SQL tool. Point ASSISTANT_DATABASE_URL at a Postgres
// role that only has SELECT grants for a database-level read-only guarantee (see README).
// Without it, the assistant reuses the main connection but still runs every query inside a
// READ ONLY transaction (services/assistant/readOnlyQuery.js).
if (process.env.ASSISTANT_DATABASE_URL && process.env.NODE_ENV !== "test") {
  ({ db: readDb, pool: readPool } = await connect(process.env.ASSISTANT_DATABASE_URL));
} else {
  readDb = db;
}

export { db, readDb, schema };
export const closeDb = async () => { await readPool?.end(); return pool ? pool.end() : pg?.close(); };

import "dotenv/config";
import * as schema from "./schema.js";

let db, pool, pg;

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
  if (/neon\.tech/.test(url)) {
    // Neon: serverless driver over WebSockets (supports transactions).
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    neonConfig.webSocketConstructor = (await import("ws")).default;
    pool = new Pool({ connectionString: url });
    db = drizzle(pool, { schema });
  } else {
    // Any other Postgres (e.g. local Docker): plain node-postgres.
    const { default: pg } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    pool = new pg.Pool({ connectionString: url });
    db = drizzle(pool, { schema });
  }
}

export { db, schema };
export const closeDb = async () => (pool ? pool.end() : pg?.close());

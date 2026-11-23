// Offline demo: in-memory Postgres (PGlite) + demo seed + API. Data resets on restart.
process.env.USE_PGLITE = "1";
process.env.DEVICE_API_KEY ||= "dev-device-key";
process.env.DATABASE_URL = ""; // empty (not deleted) so dotenv can't refill it from .env
const { seedDemo } = await import("./seed.js");
await seedDemo();
await import("./server.js");

// Offline demo: in-memory Postgres (PGlite) + demo seed + API. Data resets on restart.
process.env.USE_PGLITE = "1";
process.env.DEVICE_API_KEY ||= "dev-device-key";
delete process.env.DATABASE_URL;
const { seedDemo } = await import("./seed.js");
await seedDemo();
await import("./server.js");

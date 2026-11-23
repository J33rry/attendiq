// Vercel serverless entry. Vercel doesn't run `app.listen` (src/server.js);
// it calls this exported Express app per request. vercel.json routes every path here,
// and req.url keeps the original path (/api/auth/login, ...), so Express routes as usual.
import app from "../src/app.js";

export default app;

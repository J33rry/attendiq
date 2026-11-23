// Where the Express API runs. Change it here or set API_URL in .env.local.
// The browser calls /api on this Next.js origin and Next proxies the request to API_URL,
// so the backend's httpOnly session cookie stays first-party and no CORS setup is needed.
// On Vercel this MUST be set (Project → Settings → Environment Variables) to the deployed
// backend URL, e.g. https://attendiq-backend.vercel.app, and the frontend redeployed:
// rewrites are fixed at build time, so without it /api would point at localhost and 404.
if (process.env.VERCEL && !process.env.API_URL) {
  throw new Error("API_URL is not set. Set it to your deployed backend URL in the Vercel project settings.");
}
const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export default {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

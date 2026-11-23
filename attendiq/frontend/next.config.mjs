// Where the Express API runs. Change it here or set API_URL in .env.local.
// The browser calls /api on this Next.js origin and Next proxies the request to API_URL,
// so the backend's httpOnly session cookie stays first-party and no CORS setup is needed.
const API_URL = process.env.API_URL || "http://localhost:4000";

export default {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

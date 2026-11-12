import type { NextConfig } from "next";
// In a multi-service deployment the top-level Vercel router owns /api/near.
const servicesMode = process.env.ACCORD_VERCEL_SERVICES === "true";
const apiUrl = process.env.ACCORD_API_URL || "http://127.0.0.1:4000";
if (process.env.VERCEL === "1" && !servicesMode) {
  const upstream = new URL(apiUrl);
  if (
    upstream.protocol !== "https:" ||
    /^(localhost|127\.|\[::1\])/.test(upstream.hostname) ||
    upstream.username || upstream.password || upstream.search || upstream.hash
  ) throw new Error("Set ACCORD_API_URL to the public HTTPS Accord API before deploying to Vercel");
}
const config: NextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    if (servicesMode) return [];
    return [
      {
        source: "/api/near/:path*",
        destination:
          apiUrl.replace(/\/$/, "") + "/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;

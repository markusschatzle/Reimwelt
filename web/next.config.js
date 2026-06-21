/**
 * Next.js config for Reimwelt.
 *
 * `/api/*` is proxied to the FastAPI backend in both dev and prod via rewrites,
 * so client components can keep calling relative `/api/...` URLs unchanged.
 * In production behind nginx you may instead route `/api` straight to uvicorn
 * for one less hop; the rewrite below is a safe default that works everywhere.
 */
const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL || "http://127.0.0.1:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/de/reime",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${INTERNAL_API_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

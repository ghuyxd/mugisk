import type { NextConfig } from "next";

// CORS headers applied to every /api/* response.
// The desktop Electron client has no fixed origin (file:// in prod,
// http://localhost:5173 in dev), so we allow all origins.
// Auth is token-based — no session cookies — so wildcard origin is safe.
const CORS_HEADERS = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
  { key: "Access-Control-Max-Age", value: "86400" },
];

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment (Phase N)
  output: "standalone",

  // Typed routes — catches bad href values at compile time (promoted out of experimental in Next.js 16)
  typedRoutes: true,

  // Server external packages — must NOT be bundled; they use native FS APIs
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "chokidar",
    "music-metadata",
    "sharp",
  ],

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: CORS_HEADERS,
      },
      {
        source: "/covers/:path*",
        headers: CORS_HEADERS,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/covers/:path*",
        destination: "/api/covers/:path*",
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

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
};

export default nextConfig;

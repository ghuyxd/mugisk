import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment (Phase N)
  output: "standalone",

  // Experimental features
  experimental: {
    // Typed routes — catches bad href values at compile time
    typedRoutes: true,
  },

  // Server external packages (don't bundle on the server)
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;

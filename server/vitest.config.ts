import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Integration tests hit a real running server — no jsdom needed
    environment: "node",
    // Give the server-start step enough time
    testTimeout: 60_000,
    hookTimeout: 60_000,
    include: ["src/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

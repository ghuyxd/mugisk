// Shared environment variable types for the server
// These are read from process.env — use zod to validate at startup in a future phase

export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      DATABASE_URL: string;
      JWT_SECRET: string;
      JWT_REFRESH_SECRET: string;
      JWT_ACCESS_TOKEN_TTL?: string;
      JWT_REFRESH_TOKEN_TTL?: string;
      MUSIC_LIBRARY_PATH?: string;
      AI_API_KEY?: string;
      ANTHROPIC_API_KEY?: string;
      OPENAI_API_KEY?: string;
      PORT?: string;
    }
  }
}

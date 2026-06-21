/**
 * src/__tests__/auth.integration.test.ts
 *
 * Full integration test suite for the auth API.
 * Runs against a live Next.js dev server (port 3001 by default to avoid
 * collision with the main dev server on 3000).
 *
 * Prerequisites:
 *   - PostgreSQL running (Docker Compose stack)
 *   - DATABASE_URL pointing at a test-accessible database
 *   - JWT_SECRET and JWT_REFRESH_SECRET set in env
 *
 * Run:
 *   pnpm --filter @mugisk/server test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { exec, type ChildProcess } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const SERVER_START_TIMEOUT = 30_000; // ms

// ── Helpers ───────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

async function post(path: string, body: unknown, token?: string, ip?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (ip) headers["X-Forwarded-For"] = ip;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

async function get(path: string, token?: string, ip?: string) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (ip) headers["X-Forwarded-For"] = ip;
  const res = await fetch(`${BASE_URL}${path}`, { method: "GET", headers });
  const data = await res.json();
  return { status: res.status, data };
}

/** Wait for the dev server to become healthy. */
async function waitForServer(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Dev server did not become ready within ${timeoutMs}ms`);
}

// ── Test data ─────────────────────────────────────────────────────────────────

const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_USERNAME = `testuser_${Date.now()}`;
const TEST_PASSWORD = "TestPass123";

// Each suite uses a distinct IP so they don't share a rate-limit bucket.
const IP_REGISTER = "10.0.0.1";
const IP_LOGIN    = "10.0.0.2";
const IP_REFRESH  = "10.0.0.3";
const IP_ME       = "10.0.0.4";
const IP_ADMIN    = "10.0.0.5";
const IP_CHANGEPW = "10.0.0.6";

// ── Server lifecycle ──────────────────────────────────────────────────────────

let serverProcess: ChildProcess | null = null;

beforeAll(async () => {
  // Clean up any leftover test sessions from previous runs
  await prisma.session.deleteMany({
    where: { user: { email: { contains: "example.com" } } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: "example.com" } },
  });

  // Start Next.js on port 3001 (separate from dev server on 3000)
  serverProcess = exec("PORT=3001 node_modules/.bin/next dev --port 3001", {
    cwd: process.cwd(), // server package root
    env: { ...process.env },
  });

  await waitForServer(SERVER_START_TIMEOUT);
}, SERVER_START_TIMEOUT + 5_000);

afterAll(async () => {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }
  // Clean up test users
  await prisma.user.deleteMany({
    where: { email: { contains: "example.com" } },
  });
  await prisma.$disconnect();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("creates a new USER-role account and returns 201", async () => {
    const { status, data } = await post("/api/auth/register", {
      email: TEST_EMAIL,
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
    }, undefined, IP_REGISTER);
    expect(status).toBe(201);
    expect(data.user.email).toBe(TEST_EMAIL);
    expect(data.user.role).toBe("USER");
  });

  it("returns 409 for duplicate email", async () => {
    const { status } = await post("/api/auth/register", {
      email: TEST_EMAIL,
      username: `${TEST_USERNAME}_alt`,
      password: TEST_PASSWORD,
    }, undefined, IP_REGISTER);
    expect(status).toBe(409);
  });

  it("returns 409 for duplicate username", async () => {
    const { status } = await post("/api/auth/register", {
      email: `alt_${TEST_EMAIL}`,
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
    }, undefined, IP_REGISTER);
    expect(status).toBe(409);
  });

  it("returns 400 for weak password", async () => {
    const { status } = await post("/api/auth/register", {
      email: `weak_${TEST_EMAIL}`,
      username: `weak_${TEST_USERNAME}`,
      password: "short",
    }, undefined, IP_REGISTER);
    expect(status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const { status } = await post("/api/auth/register", {
      email: "notanemail",
      username: `emailtest_${TEST_USERNAME}`,
      password: TEST_PASSWORD,
    }, undefined, IP_REGISTER);
    expect(status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in by email and returns access + refresh tokens", async () => {
    const { status, data } = await post("/api/auth/login", {
      identifier: TEST_EMAIL,
      password: TEST_PASSWORD,
    }, undefined, IP_LOGIN);
    expect(status).toBe(200);
    expect(typeof data.accessToken).toBe("string");
    expect(typeof data.refreshToken).toBe("string");
    expect(data.user.role).toBe("USER");
  });

  it("logs in by username", async () => {
    const { status, data } = await post("/api/auth/login", {
      identifier: TEST_USERNAME,
      password: TEST_PASSWORD,
    }, undefined, IP_LOGIN);
    expect(status).toBe(200);
    expect(typeof data.accessToken).toBe("string");
  });

  it("returns 401 for wrong password", async () => {
    const { status } = await post("/api/auth/login", {
      identifier: TEST_EMAIL,
      password: "WrongPass999",
    }, undefined, IP_LOGIN);
    expect(status).toBe(401);
  });

  it("returns 401 for unknown identifier", async () => {
    const { status } = await post("/api/auth/login", {
      identifier: "ghost@nowhere.com",
      password: TEST_PASSWORD,
    }, undefined, IP_LOGIN);
    expect(status).toBe(401);
  });
});

describe("POST /api/auth/refresh (token rotation)", () => {
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const { data } = await post("/api/auth/login", {
      identifier: TEST_EMAIL,
      password: TEST_PASSWORD,
    }, undefined, IP_REFRESH);
    accessToken = data.accessToken as string;
    refreshToken = data.refreshToken as string;
  });

  it("returns new access token and new refresh token", async () => {
    const { status, data } = await post("/api/auth/refresh", { refreshToken });
    expect(status).toBe(200);
    expect(typeof data.accessToken).toBe("string");
    expect(typeof data.refreshToken).toBe("string");
    // Store rotated tokens for next test
    accessToken = data.accessToken as string;
    const newRefreshToken = data.refreshToken as string;

    // Old refresh token must be rejected after rotation
    const { status: reuseStatus } = await post("/api/auth/refresh", {
      refreshToken, // original token — already rotated out
    });
    expect(reuseStatus).toBe(401);

    refreshToken = newRefreshToken;
  });

  it("rejects an invalid refresh token", async () => {
    const { status } = await post("/api/auth/refresh", {
      refreshToken: "thisisatotallyfakeinvalidtoken",
    });
    expect(status).toBe(401);
  });

  describe("POST /api/auth/logout", () => {
    it("revokes the session and returns 204", async () => {
      const { status } = await post("/api/auth/logout", { refreshToken });
      expect(status).toBe(204);
    });

    it("refresh token no longer works after logout", async () => {
      const { status } = await post("/api/auth/refresh", { refreshToken });
      expect(status).toBe(401);
    });
  });
});

describe("GET /api/auth/me", () => {
  let accessToken: string;

  beforeAll(async () => {
    const { data } = await post("/api/auth/login", {
      identifier: TEST_EMAIL,
      password: TEST_PASSWORD,
    }, undefined, IP_ME);
    accessToken = data.accessToken as string;
  });

  it("returns user profile with a valid access token", async () => {
    const { status, data } = await get("/api/auth/me", accessToken);
    expect(status).toBe(200);
    expect(data.user.email).toBe(TEST_EMAIL);
    expect(data.user.username).toBe(TEST_USERNAME);
  });

  it("returns 401 without a token", async () => {
    const { status } = await get("/api/auth/me");
    expect(status).toBe(401);
  });

  it("returns 401 with a malformed token", async () => {
    const { status } = await get("/api/auth/me", "not.a.valid.jwt");
    expect(status).toBe(401);
  });
});

describe("GET /api/auth/admin-only (role-based access)", () => {
  let userAccessToken: string;
  let adminAccessToken: string;

  beforeAll(async () => {
    // USER-role token
    const { data: userData } = await post("/api/auth/login", {
      identifier: TEST_EMAIL,
      password: TEST_PASSWORD,
    }, undefined, IP_ADMIN);
    userAccessToken = userData.accessToken as string;

    // ADMIN token — use the seeded admin account
    const adminEmail = process.env.ADMIN_EMAIL ?? "admin@mugisk.local";
    const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme123";
    const { data: adminData } = await post("/api/auth/login", {
      identifier: adminEmail,
      password: adminPassword,
    }, undefined, IP_ADMIN);
    adminAccessToken = adminData.accessToken as string;
  });

  it("allows access to an ADMIN-role token", async () => {
    const { status } = await get("/api/auth/admin-only", adminAccessToken);
    expect(status).toBe(200);
  });

  it("rejects a USER-role token with 403", async () => {
    const { status } = await get("/api/auth/admin-only", userAccessToken);
    expect(status).toBe(403);
  });

  it("rejects a request with no token with 401", async () => {
    const { status } = await get("/api/auth/admin-only");
    expect(status).toBe(401);
  });
});

describe("POST /api/auth/change-password", () => {
  const NEW_PASSWORD = "NewPass456";
  let accessToken: string;
  let refreshToken: string;
  // Use a short timestamp-based ID so the username stays under 30 chars
  const ts = Date.now().toString().slice(-8);
  const cpEmail = `pw_${ts}@example.com`;
  const cpUsername = `pw_${ts}`;

  beforeAll(async () => {
    // Register a throwaway user using a unique IP to avoid hitting the rate limiter.
    const regRes = await post("/api/auth/register", {
      email: cpEmail,
      username: cpUsername,
      password: TEST_PASSWORD,
    }, undefined, IP_CHANGEPW);
    if (regRes.status !== 201) {
      throw new Error(`[changepw beforeAll] register failed: ${regRes.status} ${JSON.stringify(regRes.data)}`);
    }

    const loginRes = await post("/api/auth/login", {
      identifier: cpEmail,
      password: TEST_PASSWORD,
    }, undefined, IP_CHANGEPW);
    if (loginRes.status !== 200) {
      throw new Error(`[changepw beforeAll] login failed: ${loginRes.status} ${JSON.stringify(loginRes.data)}`);
    }
    accessToken = loginRes.data.accessToken as string;
    refreshToken = loginRes.data.refreshToken as string;
  });

  it("changes password and returns 200", async () => {
    const { status, data } = await post(
      "/api/auth/change-password",
      { currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD },
      accessToken,
    );
    expect(status).toBe(200);
    expect(data.message).toContain("Password changed");
  });

  it("old refresh token is revoked after password change", async () => {
    const { status } = await post("/api/auth/refresh", { refreshToken });
    expect(status).toBe(401);
  });

  it("can log in with the new password", async () => {
    const { status } = await post("/api/auth/login", {
      identifier: cpEmail,
      password: NEW_PASSWORD,
    }, undefined, IP_CHANGEPW);
    expect(status).toBe(200);
  });

  it("returns 401 for wrong current password", async () => {
    // Get a fresh token with the new password first
    const { data } = await post("/api/auth/login", {
      identifier: cpEmail,
      password: NEW_PASSWORD,
    }, undefined, IP_CHANGEPW);
    const { status } = await post(
      "/api/auth/change-password",
      { currentPassword: "WrongPass999", newPassword: "AnotherPass789" },
      data.accessToken as string,
    );
    expect(status).toBe(401);
  });
});


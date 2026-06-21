/**
 * src/lib/auth.ts
 *
 * Core authentication utilities:
 *  - Access token  : short-lived JWT (15 min) signed with JWT_SECRET
 *  - Refresh token : opaque 32-byte random hex string; stored HASHED in the DB
 *  - hashToken     : SHA-256 hash used when storing/comparing refresh tokens
 */

import { randomBytes, createHash } from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { UserRole } from "@prisma/client";

// ── Secrets ───────────────────────────────────────────────────────────────────

function getSecret(envKey: string): Uint8Array {
  const value = process.env[envKey];
  if (!value) {
    throw new Error(`Missing required environment variable: ${envKey}`);
  }
  return new TextEncoder().encode(value);
}

// ── Access token ──────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string; // userId
  role: UserRole;
}

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TOKEN_TTL ?? "15m";

export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecret("JWT_SECRET"));
}

export interface VerifiedAccessToken {
  userId: string;
  role: UserRole;
}

export async function verifyAccessToken(
  token: string,
): Promise<VerifiedAccessToken> {
  const { payload } = await jwtVerify<JWTPayload & { role: UserRole }>(
    token,
    getSecret("JWT_SECRET"),
  );

  if (!payload.sub || !payload.role) {
    throw new Error("Invalid token payload");
  }

  return { userId: payload.sub, role: payload.role };
}

// ── Refresh token ─────────────────────────────────────────────────────────────

/** TTL for refresh tokens in milliseconds (default 30 days). */
export const REFRESH_TOKEN_TTL_MS =
  parseTTL(process.env.JWT_REFRESH_TOKEN_TTL ?? "30d");

function parseTTL(ttl: string): number {
  const match = ttl.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid TTL format: "${ttl}"`);
  const value = parseInt(match[1]!, 10);
  const unit = match[2] as "s" | "m" | "h" | "d";
  const multipliers: Record<"s" | "m" | "h" | "d", number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit];
}

/** Generate a cryptographically random refresh token (raw hex, never stored). */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

/** SHA-256 hash of a token — this is what gets stored in the Session table. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

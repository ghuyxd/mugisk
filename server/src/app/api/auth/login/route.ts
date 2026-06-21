/**
 * POST /api/auth/login
 *
 * Authenticates a user by email OR username + password.
 * On success issues a short-lived JWT access token (15 min) and a long-lived
 * opaque refresh token (30 days), stored hashed in the Session table.
 * Rate limited: 10 req / 60 s per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} from "@/lib/auth";
import { authRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/middleware";

const loginSchema = z.object({
  /** Can be either an email address or a username. */
  identifier: z.string().min(1, "identifier is required"),
  password: z.string().min(1, "password is required"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limiting
  const ip = getClientIp(req);
  if (!authRateLimiter.check(`login:${ip}`)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  // Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { identifier, password } = parsed.data;

  // Lookup by email or username
  const isEmail = identifier.includes("@");
  const user = await prisma.user.findFirst({
    where: isEmail
      ? { email: identifier.toLowerCase() }
      : { username: identifier },
  });

  // Constant-time comparison even on user-not-found to resist timing attacks
  const DUMMY_HASH =
    "$2a$12$invalidhashpaddingtoensureconstanttimeverificationXXXX";
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatch) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 },
    );
  }

  if (user.isDisabled) {
    return NextResponse.json(
      { error: "This account has been disabled" },
      { status: 403 },
    );
  }

  // Issue tokens
  const accessToken = await signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      expiresAt,
      userAgent: req.headers.get("user-agent") ?? undefined,
      ipAddress: getClientIp(req),
    },
  });

  return NextResponse.json(
    {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, role: user.role },
    },
    { status: 200 },
  );
}

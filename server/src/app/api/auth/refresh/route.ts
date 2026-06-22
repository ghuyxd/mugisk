/**
 * POST /api/auth/refresh
 *
 * Verifies a refresh token against the hashed value stored in the Session table,
 * then performs token rotation:
 *   - Old session is revoked (revokedAt set)
 *   - A new session with a new refresh token is created
 *   - A new access token is issued
 *
 * Reused (already-rotated) refresh tokens are rejected immediately.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} from "@/lib/auth";
import { getClientIp } from "@/lib/middleware";
import { corsHeaders, handleOptions } from "@/lib/cors";

export { handleOptions as OPTIONS };

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders() });
  }

  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400, headers: corsHeaders() },
    );
  }

  const { refreshToken } = parsed.data;
  const tokenHash = hashToken(refreshToken);

  // Lookup the session by hash
  const session = await prisma.session.findFirst({
    where: { refreshTokenHash: tokenHash },
    include: { user: true },
  });

  if (!session) {
    return NextResponse.json(
      { error: "Invalid refresh token" },
      { status: 401, headers: corsHeaders() },
    );
  }

  // Check for revocation or expiry
  const now = new Date();

  if (session.revokedAt !== null) {
    // Token reuse detected — this session was already rotated out.
    // Optionally revoke ALL sessions for this user as a security measure.
    await prisma.session.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    return NextResponse.json(
      { error: "Refresh token has already been used. All sessions revoked." },
      { status: 401, headers: corsHeaders() },
    );
  }

  if (session.expiresAt < now) {
    return NextResponse.json(
      { error: "Refresh token has expired" },
      { status: 401, headers: corsHeaders() },
    );
  }

  if (session.user.isDisabled) {
    return NextResponse.json(
      { error: "This account has been disabled" },
      { status: 403, headers: corsHeaders() },
    );
  }

  // Token rotation: revoke old session, create new one
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.$transaction([
    // Revoke old session
    prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: now },
    }),
    // Create new session
    prisma.session.create({
      data: {
        userId: session.userId,
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
        userAgent: req.headers.get("user-agent") ?? undefined,
        ipAddress: getClientIp(req),
      },
    }),
  ]);

  // Issue new access token
  const accessToken = await signAccessToken({
    sub: session.userId,
    role: session.user.role,
  });

  return NextResponse.json(
    { accessToken, refreshToken: newRefreshToken },
    { status: 200, headers: corsHeaders() },
  );
}

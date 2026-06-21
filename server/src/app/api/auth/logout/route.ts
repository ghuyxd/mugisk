/**
 * POST /api/auth/logout
 *
 * Revokes the session tied to the provided refresh token.
 * Returns 204 No Content regardless of whether the token was found
 * (to avoid leaking session existence information).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth";

const logoutSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = logoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const tokenHash = hashToken(parsed.data.refreshToken);

  // Revoke the session if it exists and isn't already revoked
  await prisma.session.updateMany({
    where: {
      refreshTokenHash: tokenHash,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  return new NextResponse(null, { status: 204 });
}

/**
 * GET /api/auth/me
 *
 * Returns the current user's profile.
 * Requires a valid Bearer access token.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware";

export async function GET(req: NextRequest): Promise<NextResponse> {
  let claims;
  try {
    claims = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
      isDisabled: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.isDisabled) {
    return NextResponse.json({ error: "Account disabled" }, { status: 403 });
  }

  return NextResponse.json({ user }, { status: 200 });
}

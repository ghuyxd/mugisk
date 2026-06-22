/**
 * POST /api/admin/users/[id]/sessions/revoke-all
 *
 * Admin-only. Immediately revokes all active sessions for a user.
 * Combined with the isDisabled check in requireAuth, this ensures
 * the user cannot continue using any existing tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export const POST = withAdmin(
  async (_req: NextRequest, _claims, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { count } = await prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ revokedCount: count });
  },
);

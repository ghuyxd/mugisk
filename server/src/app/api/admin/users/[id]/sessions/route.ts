/**
 * GET /api/admin/users/[id]/sessions
 *
 * Admin-only. Returns all active (non-revoked, non-expired) sessions for a user.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export const GET = withAdmin(
  async (_req: NextRequest, _claims, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId: id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({ sessions });
  },
);

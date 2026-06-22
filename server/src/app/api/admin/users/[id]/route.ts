/**
 * PATCH /api/admin/users/[id]
 *
 * Admin-only. Update a user's role and/or disabled status.
 * An admin cannot disable their own account (prevents lockout).
 *
 * Body: { role?: "ADMIN" | "USER", isDisabled?: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const bodySchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  isDisabled: z.boolean().optional(),
});

export const PATCH = withAdmin(
  async (req: NextRequest, claims, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    // Prevent admins from disabling/demoting themselves
    if (id === claims.userId) {
      return NextResponse.json(
        { error: "You cannot modify your own account via this endpoint." },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { role, isDisabled } = parsed.data;
    if (role === undefined && isDisabled === undefined) {
      return NextResponse.json(
        { error: "At least one of role or isDisabled must be provided." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(isDisabled !== undefined && { isDisabled }),
      },
      select: { id: true, email: true, username: true, role: true, isDisabled: true, updatedAt: true },
    });

    return NextResponse.json({ user: updated });
  },
);

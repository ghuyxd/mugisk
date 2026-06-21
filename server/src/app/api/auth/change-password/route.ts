/**
 * POST /api/auth/change-password
 *
 * Allows an authenticated user to change their password.
 * - Verifies the current password before accepting the new one.
 * - Revokes all existing sessions after the change (forces re-login).
 *
 * TODO: Implement password-reset-via-email flow (send a time-limited token
 *       to the user's email address so they can reset a forgotten password
 *       without knowing the current one).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "currentPassword is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
    .regex(/[0-9]/, "New password must contain at least one digit"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Authenticate
  let claims;
  try {
    claims = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  // Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  // Fetch user
  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { id: true, passwordHash: true, isDisabled: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.isDisabled) {
    return NextResponse.json({ error: "Account disabled" }, { status: 403 });
  }

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 },
    );
  }

  // Hash new password and revoke all sessions in a transaction
  const newPasswordHash = await bcrypt.hash(newPassword, 12);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    }),
    // Force re-login on all devices
    prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);

  return NextResponse.json(
    { message: "Password changed successfully. Please log in again." },
    { status: 200 },
  );
}

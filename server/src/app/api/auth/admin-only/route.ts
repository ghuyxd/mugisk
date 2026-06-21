/**
 * GET /api/auth/admin-only
 *
 * Test route to verify requireAdmin rejects non-admin tokens with 403.
 * This route is only useful in testing; it can be removed or gated in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/middleware";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const claims = await requireAdmin(req);
    return NextResponse.json({ ok: true, userId: claims.userId }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }
}

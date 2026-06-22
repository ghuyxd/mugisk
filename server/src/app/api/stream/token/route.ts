/**
 * POST /api/stream/token
 *
 * Mints a short-lived stream token (5-minute JWT) in exchange for a valid
 * access token. The stream token is passed as ?token= to the stream endpoint,
 * enabling browser <audio> elements to authenticate without custom headers.
 *
 * Why a separate token instead of the regular access token?
 *   - Stream tokens have a 5-minute TTL, limiting the damage of a leaked URL.
 *   - The regular access token (15 min default) should not be embedded in URLs
 *     since URLs appear in server logs, browser history, and referrer headers.
 *
 * Requires: Authorization: Bearer <accessToken>
 *
 * Response:
 *   { token: string; expiresIn: 300 }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/middleware";
import { signStreamToken } from "@/lib/auth";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let claims;
  try {
    claims = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  const token = await signStreamToken({
    sub: claims.userId,
    role: claims.role,
  });

  return NextResponse.json({ token, expiresIn: 300 });
}

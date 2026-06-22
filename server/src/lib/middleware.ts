/**
 * src/lib/middleware.ts
 *
 * Reusable request guards for Next.js App Router route handlers.
 * These are plain async functions, NOT Next.js Middleware — they are called
 * at the top of each protected route handler.
 *
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     const { userId, role } = await requireAuth(req);
 *     ...
 *   }
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  verifyAccessToken,
  verifyStreamToken,
  type VerifiedAccessToken,
} from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }

  toResponse(): NextResponse {
    return NextResponse.json({ error: this.message }, { status: this.status });
  }
}

/**
 * Extract and verify the Bearer access token from the Authorization header.
 * Also performs a DB lookup to ensure the user's account is not disabled —
 * this means disabling a user takes effect immediately on their next request,
 * regardless of their token's remaining TTL.
 *
 * Throws `AuthError(401)` if token is missing/invalid.
 * Throws `AuthError(403)` if the user account is disabled.
 */
export async function requireAuth(
  req: NextRequest,
): Promise<VerifiedAccessToken> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError(401, "Missing or malformed Authorization header");
  }

  const token = authHeader.slice(7);

  let claims: VerifiedAccessToken;
  try {
    claims = await verifyAccessToken(token);
  } catch {
    throw new AuthError(401, "Invalid or expired access token");
  }

  // DB check: reject immediately if account has been disabled since this
  // token was issued. We use a lightweight select to minimise query cost.
  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { isDisabled: true },
  });

  if (!user) {
    throw new AuthError(401, "User not found");
  }

  if (user.isDisabled) {
    throw new AuthError(403, "Account disabled");
  }

  return claims;
}

/**
 * Like `requireAuth`, but also accepts a short-lived stream token passed as the
 * `?token=` query parameter. Intended exclusively for the stream endpoint,
 * where native <audio> elements cannot set custom HTTP headers.
 *
 * Resolution order:
 *   1. Authorization: Bearer <accessToken>  (standard clients)
 *   2. ?token=<streamToken>                 (browser <audio> elements)
 *
 * Throws `AuthError(401)` if neither is present or both are invalid.
 */
export async function requireAuthOrToken(
  req: NextRequest,
): Promise<VerifiedAccessToken> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      return await verifyAccessToken(token);
    } catch {
      throw new AuthError(401, "Invalid or expired access token");
    }
  }

  const queryToken = req.nextUrl.searchParams.get("token");
  if (queryToken) {
    try {
      return await verifyStreamToken(queryToken);
    } catch {
      throw new AuthError(401, "Invalid or expired stream token");
    }
  }

  throw new AuthError(401, "Missing Authorization header or stream token");
}

/**
 * Like `requireAuth`, but additionally requires the `ADMIN` role.
 * Throws `AuthError(403)` for authenticated non-admin users.
 */
export async function requireAdmin(
  req: NextRequest,
): Promise<VerifiedAccessToken> {
  const claims = await requireAuth(req);

  if (claims.role !== UserRole.ADMIN) {
    throw new AuthError(403, "Admin access required");
  }

  return claims;
}

/**
 * Utility: wrap a route handler so AuthError instances are automatically
 * converted to the correct HTTP response instead of propagating as unhandled.
 *
 * Supports an optional `context` third argument for dynamic-route segments
 * (e.g. `{ params: Promise<{ id: string }> }`).
 *
 * Example (static route):
 *   export const GET = withAuth(async (req, claims) => { ... });
 *
 * Example (dynamic route):
 *   export const PATCH = withAuth(async (req, claims, ctx) => {
 *     const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
 *   });
 */
export function withAuth<Ctx = unknown>(
  handler: (
    req: NextRequest,
    claims: VerifiedAccessToken,
    ctx: Ctx,
  ) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    try {
      const claims = await requireAuth(req);
      return await handler(req, claims, ctx);
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      throw err;
    }
  };
}

export function withAdmin<Ctx = unknown>(
  handler: (
    req: NextRequest,
    claims: VerifiedAccessToken,
    ctx: Ctx,
  ) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    try {
      const claims = await requireAdmin(req);
      return await handler(req, claims, ctx);
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      throw err;
    }
  };
}

/** Extract the client IP from common forwarding headers. */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

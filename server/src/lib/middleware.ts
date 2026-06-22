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
 * Throws `AuthError(401)` on any failure.
 */
export async function requireAuth(
  req: NextRequest,
): Promise<VerifiedAccessToken> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError(401, "Missing or malformed Authorization header");
  }

  const token = authHeader.slice(7);

  try {
    return await verifyAccessToken(token);
  } catch {
    throw new AuthError(401, "Invalid or expired access token");
  }
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
 * Example:
 *   export const GET = withAuth(async (req, claims) => {
 *     return NextResponse.json({ userId: claims.userId });
 *   });
 */
export function withAuth(
  handler: (
    req: NextRequest,
    claims: VerifiedAccessToken,
  ) => Promise<NextResponse>,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const claims = await requireAuth(req);
      return await handler(req, claims);
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      throw err;
    }
  };
}

export function withAdmin(
  handler: (
    req: NextRequest,
    claims: VerifiedAccessToken,
  ) => Promise<NextResponse>,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const claims = await requireAdmin(req);
      return await handler(req, claims);
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

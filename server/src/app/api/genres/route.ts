/**
 * GET /api/genres
 *
 * Returns all distinct genres in the library with their track counts,
 * sorted alphabetically. Null/empty genres are excluded.
 * Requires a valid access token.
 *
 * Response:
 *   { data: Array<{ genre: string; trackCount: number }> }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  // groupBy returns one row per distinct genre value.
  // Prisma's groupBy only returns non-null values when we filter with NOT null.
  const groups = await prisma.track.groupBy({
    by: ["genre"],
    where: { genre: { not: null } },
    _count: { genre: true },
    orderBy: { genre: "asc" },
  });

  const data = groups
    .filter((g): g is typeof g & { genre: string } => g.genre !== null)
    .map((g) => ({
      genre: g.genre,
      trackCount: g._count.genre,
    }));

  return NextResponse.json({ data });
}

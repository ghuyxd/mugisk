/**
 * GET /api/artists
 *
 * Returns a paginated list of artists.
 * Requires a valid access token.
 *
 * Query params:
 *   page    (default 1)
 *   limit   (default 20, max 100)
 *   search  — case-insensitive match on artist name
 *
 * Response:
 *   { data: Artist[], meta: { total, page, pageSize, totalPages } }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware";
import { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Query schema
// ─────────────────────────────────────────────────────────────────────────────

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { page, limit, search } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.ArtistWhereInput = {};
  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const [artists, total] = await Promise.all([
    prisma.artist.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        bio: true,
        imageUrl: true,
        _count: { select: { albums: true, tracks: true } },
      },
    }),
    prisma.artist.count({ where }),
  ]);

  return NextResponse.json({
    data: artists,
    meta: {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

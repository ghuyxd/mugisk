/**
 * GET /api/albums
 *
 * Returns a paginated list of albums.
 * Requires a valid access token.
 *
 * Query params:
 *   page      (default 1)
 *   limit     (default 20, max 100)
 *   search    — case-insensitive match on album title OR artist name
 *   artistId  — filter by artist
 *
 * Response:
 *   { data: Album[], meta: { total, page, pageSize, totalPages } }
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
  artistId: z.string().optional(),
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

  const { page, limit, search, artistId } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.AlbumWhereInput = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { artist: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (artistId) where.artistId = artistId;

  const [albums, total] = await Promise.all([
    prisma.album.findMany({
      where,
      skip,
      take: limit,
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        year: true,
        coverUrl: true,
        artist: { select: { id: true, name: true } },
        _count: { select: { tracks: true } },
      },
    }),
    prisma.album.count({ where }),
  ]);

  return NextResponse.json({
    data: albums,
    meta: {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * GET /api/tracks
 *
 * Returns a paginated, filterable, sortable list of tracks.
 * Requires a valid access token.
 *
 * Query params:
 *   page        (default 1)
 *   limit       (default 20, max 100)
 *   search      — case-insensitive match on title OR artist name
 *   genre       — exact genre match
 *   albumId     — filter by album
 *   artistId    — filter by artist
 *   sortBy      — "title" | "createdAt" | "durationSeconds" (default "title")
 *   sortOrder   — "asc" | "desc" (default "asc")
 *
 * Response:
 *   { data: Track[], meta: { total, page, pageSize, totalPages } }
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
  genre: z.string().optional(),
  albumId: z.string().optional(),
  artistId: z.string().optional(),
  sortBy: z.enum(["title", "createdAt", "durationSeconds", "artist", "album"]).default("title"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
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

  const { page, limit, search, genre, albumId, artistId, sortBy, sortOrder } = parsed.data;
  const skip = (page - 1) * limit;

  // Build the where clause
  const where: Prisma.TrackWhereInput = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { artist: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (genre) where.genre = { equals: genre, mode: "insensitive" };
  if (albumId) where.albumId = albumId;
  if (artistId) where.artistId = artistId;

  let orderBy: Prisma.TrackOrderByWithRelationInput = {};
  if (sortBy === "artist") {
    orderBy = { artist: { name: sortOrder } };
  } else if (sortBy === "album") {
    orderBy = { album: { title: sortOrder } };
  } else {
    orderBy = { [sortBy]: sortOrder };
  }

  const [tracks, total] = await Promise.all([
    prisma.track.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        trackNumber: true,
        discNumber: true,
        durationSeconds: true,
        genre: true,
        format: true,
        bitrate: true,
        createdAt: true,
        artist: { select: { id: true, name: true } },
        album: { select: { id: true, title: true, coverUrl: true, year: true } },
      },
    }),
    prisma.track.count({ where }),
  ]);

  return NextResponse.json({
    data: tracks,
    meta: {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

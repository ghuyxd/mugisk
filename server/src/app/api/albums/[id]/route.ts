/**
 * GET /api/albums/:id
 *
 * Returns a single album with its tracks ordered by disc/track number.
 * Requires a valid access token.
 *
 * Response:
 *   { id, title, year, coverUrl, artist, tracks: Track[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  const { id } = await params;

  const album = await prisma.album.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      year: true,
      coverUrl: true,
      artist: { select: { id: true, name: true } },
      tracks: {
        orderBy: [
          { discNumber: "asc" },
          { trackNumber: "asc" },
          { title: "asc" },
        ],
        select: {
          id: true,
          title: true,
          trackNumber: true,
          discNumber: true,
          durationSeconds: true,
          genre: true,
          format: true,
          bitrate: true,
          artist: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  return NextResponse.json(album);
}

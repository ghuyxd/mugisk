/**
 * GET /api/artists/:id
 *
 * Returns a single artist with their albums.
 * Requires a valid access token.
 *
 * Response:
 *   { id, name, bio, imageUrl, albums: Album[] }
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

  const artist = await prisma.artist.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      bio: true,
      imageUrl: true,
      albums: {
        orderBy: [{ year: "desc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          year: true,
          coverUrl: true,
          _count: { select: { tracks: true } },
        },
      },
    },
  });

  if (!artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  return NextResponse.json(artist);
}

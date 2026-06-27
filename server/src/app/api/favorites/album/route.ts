import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const toggleSchema = z.object({
  albumId: z.string(),
});

export const POST = withAuth(async (req, claims) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { albumId } = parsed.data;

  // Find all tracks in this album
  const tracks = await prisma.track.findMany({
    where: { albumId }
  });

  if (tracks.length === 0) {
    return NextResponse.json({ success: true, count: 0 });
  }

  const trackIds = tracks.map(t => t.id);

  // Check how many are already favorited
  const existing = await prisma.favoriteTrack.findMany({
    where: {
      userId: claims.userId,
      trackId: { in: trackIds }
    }
  });

  // If all tracks are favorited, unfavorite them all. Otherwise, favorite the missing ones.
  if (existing.length === tracks.length) {
    // Unfavorite all
    await prisma.favoriteTrack.deleteMany({
      where: {
        userId: claims.userId,
        trackId: { in: trackIds }
      }
    });
    return NextResponse.json({ success: true, isFavorite: false });
  } else {
    // Favorite missing
    const existingIds = new Set(existing.map(e => e.trackId));
    const missingIds = trackIds.filter(id => !existingIds.has(id));

    await prisma.favoriteTrack.createMany({
      data: missingIds.map(id => ({
        userId: claims.userId,
        trackId: id
      }))
    });
    return NextResponse.json({ success: true, isFavorite: true });
  }
});

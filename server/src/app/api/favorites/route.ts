import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (req, claims) => {
  const favorites = await prisma.favoriteTrack.findMany({
    where: { userId: claims.userId },
    orderBy: { createdAt: "desc" },
    include: {
      track: {
        include: {
          album: true,
          artist: true,
        }
      }
    }
  });

  // Map to match the Track interface expected by the client
  const tracks = favorites.map(f => ({
    id: f.track.id,
    title: f.track.title,
    artist: f.track.artist.name,
    album: f.track.album?.title || "Unknown Album",
    albumArtist: f.track.artist.name,
    genre: f.track.genre || undefined,
    duration: f.track.durationSeconds,
    filePath: f.track.filePath,
    coverArtId: f.track.album?.coverUrl || f.track.artist.imageUrl || undefined,
    createdAt: f.track.createdAt.toISOString(),
    updatedAt: f.track.createdAt.toISOString(),
    isFavorite: true,
  }));

  return NextResponse.json({ success: true, data: tracks });
});

const toggleSchema = z.object({
  trackId: z.string(),
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

  const { trackId } = parsed.data;

  // Check if it's already favorited
  const existing = await prisma.favoriteTrack.findUnique({
    where: {
      userId_trackId: {
        userId: claims.userId,
        trackId: trackId,
      }
    }
  });

  if (existing) {
    // Unfavorite
    await prisma.favoriteTrack.delete({
      where: { id: existing.id }
    });
    return NextResponse.json({ success: true, isFavorite: false });
  } else {
    // Favorite
    await prisma.favoriteTrack.create({
      data: {
        userId: claims.userId,
        trackId: trackId,
      }
    });
    return NextResponse.json({ success: true, isFavorite: true });
  }
});

/**
 * POST /api/playlists/:id/tracks
 *
 * Adds a track to the playlist. Automatically assigns the next position
 * (max existing position + 1). Prevents duplicate tracks in a playlist.
 *
 * Requires a valid access token and playlist ownership.
 *
 * Body:
 *   { trackId: string }
 *
 * Response:
 *   201 { id, playlistId, trackId, position }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware";

const addTrackSchema = z.object({
  trackId: z.string().min(1, "trackId is required"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  let claims;
  try {
    claims = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  const { id: playlistId } = await params;

  // Verify playlist exists and belongs to this user
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { userId: true },
  });

  if (!playlist) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }
  if (playlist.userId !== claims.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = addTrackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { trackId } = parsed.data;

  // Verify track exists
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { id: true },
  });
  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  // Check for duplicate — PlaylistTrack has a unique([playlistId, trackId]) constraint
  const existing = await prisma.playlistTrack.findUnique({
    where: { playlistId_trackId: { playlistId, trackId } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Track is already in this playlist" },
      { status: 409 },
    );
  }

  // Determine next position: max existing position + 1 (or 0 if empty)
  const aggregate = await prisma.playlistTrack.aggregate({
    where: { playlistId },
    _max: { position: true },
  });
  const nextPosition = (aggregate._max.position ?? -1) + 1;

  const playlistTrack = await prisma.playlistTrack.create({
    data: { playlistId, trackId, position: nextPosition },
    select: { id: true, playlistId: true, trackId: true, position: true },
  });

  return NextResponse.json(playlistTrack, { status: 201 });
}

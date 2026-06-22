/**
 * DELETE /api/playlists/:id/tracks/:trackId
 *
 * Removes a track from the playlist and compacts positions so they remain
 * contiguous (0, 1, 2, …) without gaps. Uses a transaction to keep the
 * remove + compact atomic.
 *
 * Requires a valid access token and playlist ownership.
 *
 * Response: 204 No Content
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; trackId: string }> },
): Promise<NextResponse> {
  let claims;
  try {
    claims = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  const { id: playlistId, trackId } = await params;

  // Verify ownership
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

  // Verify the track is actually in this playlist
  const entry = await prisma.playlistTrack.findUnique({
    where: { playlistId_trackId: { playlistId, trackId } },
    select: { id: true, position: true },
  });

  if (!entry) {
    return NextResponse.json(
      { error: "Track not found in playlist" },
      { status: 404 },
    );
  }

  await prisma.$transaction(async (tx) => {
    // Delete the entry
    await tx.playlistTrack.delete({ where: { id: entry.id } });

    // Compact: decrement position for all items after the deleted one
    await tx.playlistTrack.updateMany({
      where: { playlistId, position: { gt: entry.position } },
      data: { position: { decrement: 1 } },
    });
  });

  return new NextResponse(null, { status: 204 });
}

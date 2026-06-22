/**
 * PATCH /api/playlists/:id/reorder
 *
 * Rewrites track positions for a playlist based on a client-supplied ordered
 * array of trackIds. All positions are rewritten in a single transaction to
 * ensure consistency (no gaps, no conflicts mid-reorder).
 *
 * Requires a valid access token and playlist ownership.
 *
 * Body:
 *   { trackIds: string[] }  — full ordered list of all track IDs in the playlist
 *
 * Rules:
 *   - trackIds must contain exactly the same set of tracks currently in the
 *     playlist (no additions, no omissions). Returns 400 otherwise.
 *   - Positions are assigned as 0-based index in the supplied array.
 *
 * Response:
 *   200 { message: "Reordered N tracks" }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware";

const reorderSchema = z.object({
  trackIds: z.array(z.string()).min(1, "trackIds must not be empty"),
});

export async function PATCH(
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { trackIds } = parsed.data;

  // Load all current PlaylistTrack entries
  const existingEntries = await prisma.playlistTrack.findMany({
    where: { playlistId },
    select: { id: true, trackId: true },
  });

  // Build a map: trackId → PlaylistTrack.id
  const entryMap = new Map(existingEntries.map((e) => [e.trackId, e.id]));
  const existingSet = new Set(entryMap.keys());
  const suppliedSet = new Set(trackIds);

  // Validate: supplied list must match existing tracks exactly
  const missing = [...existingSet].filter((id) => !suppliedSet.has(id));
  const extra = [...suppliedSet].filter((id) => !existingSet.has(id));

  if (missing.length > 0 || extra.length > 0) {
    return NextResponse.json(
      {
        error: "trackIds must contain exactly the tracks currently in the playlist",
        missing,
        extra,
      },
      { status: 400 },
    );
  }

  // Check for duplicates in the supplied array
  if (suppliedSet.size !== trackIds.length) {
    return NextResponse.json(
      { error: "trackIds contains duplicate entries" },
      { status: 400 },
    );
  }

  // Rewrite all positions atomically
  await prisma.$transaction(
    trackIds.map((trackId, index) =>
      prisma.playlistTrack.update({
        where: { id: entryMap.get(trackId)! },
        data: { position: index },
      }),
    ),
  );

  return NextResponse.json({ message: `Reordered ${trackIds.length} tracks` });
}

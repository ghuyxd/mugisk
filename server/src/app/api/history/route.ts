/**
 * POST /api/history
 *
 * Logs a PlayHistory row (scrobble) for the authenticated user.
 * Intended to be called "fire and forget" by the client when playback starts.
 *
 * Body:
 *   { trackId: string }
 *
 * Response:
 *   204 No Content on success (fast path — client doesn't need the row data)
 *   400 if body is invalid
 *   401 if not authenticated
 *   404 if the track doesn't exist
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware";

const historySchema = z.object({
  trackId: z.string().min(1, "trackId is required"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let claims;
  try {
    claims = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = historySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { trackId } = parsed.data;

  // Verify track exists before logging to avoid orphan rows
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { id: true },
  });
  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  await prisma.playHistory.create({
    data: {
      userId: claims.userId,
      trackId,
      // playedAt defaults to now() in the schema
    },
  });

  return new NextResponse(null, { status: 204 });
}

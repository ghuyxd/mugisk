/**
 * GET    /api/playlists/:id  — Get playlist with ordered tracks
 * PATCH  /api/playlists/:id  — Rename or toggle isPublic
 * DELETE /api/playlists/:id  — Delete (owner only)
 *
 * Requires a valid access token. All mutations are owner-only (403 otherwise).
 *
 * PATCH body (all fields optional):
 *   { name?: string; isPublic?: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a playlist and verify that the requesting user is the owner.
 * Returns null if not found, "forbidden" if owned by another user.
 */
async function getOwnedPlaylist(id: string, userId: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!playlist) return { playlist: null, forbidden: false };
  if (playlist.userId !== userId) return { playlist: null, forbidden: true };
  return { playlist, forbidden: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/playlists/:id
// ─────────────────────────────────────────────────────────────────────────────

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

  const playlist = await prisma.playlist.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      isPublic: true,
      createdAt: true,
      userId: true,
      tracks: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          track: {
            select: {
              id: true,
              title: true,
              durationSeconds: true,
              genre: true,
              format: true,
              artist: { select: { id: true, name: true } },
              album: { select: { id: true, title: true, coverUrl: true } },
            },
          },
        },
      },
    },
  });

  if (!playlist) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  // Flatten PlaylistTrack join rows
  const response = {
    ...playlist,
    tracks: playlist.tracks.map((pt) => ({
      position: pt.position,
      ...pt.track,
    })),
  };

  return NextResponse.json(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/playlists/:id
// ─────────────────────────────────────────────────────────────────────────────

const patchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    isPublic: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.isPublic !== undefined, {
    message: "At least one of name or isPublic must be provided",
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

  const { id } = await params;
  const { playlist, forbidden } = await getOwnedPlaylist(id, claims.userId);

  if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.playlist.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      isPublic: true,
      createdAt: true,
      _count: { select: { tracks: true } },
    },
  });

  return NextResponse.json(updated);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/playlists/:id
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(
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

  const { id } = await params;
  const { playlist, forbidden } = await getOwnedPlaylist(id, claims.userId);

  if (forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });

  await prisma.playlist.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}

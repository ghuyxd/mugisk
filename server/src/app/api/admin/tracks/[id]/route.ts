/**
 * PATCH /api/admin/tracks/[id]
 * DELETE /api/admin/tracks/[id]
 *
 * Admin-only. Inline-edit a track's metadata or delete a track from the DB.
 * Allowed PATCH fields: title, genre.
 * DELETE removes the DB row only — the file on disk is NOT deleted.
 *
 * Body (PATCH): { title?: string, genre?: string | null }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { cleanupOrphans } from "@/lib/library/watcher";

const bodySchema = z.object({
  title: z.string().min(1).optional(),
  genre: z.string().nullable().optional(),
});

export const PATCH = withAdmin(
  async (req: NextRequest, _claims, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { title, genre } = parsed.data;
    if (title === undefined && genre === undefined) {
      return NextResponse.json(
        { error: "At least one of title or genre must be provided." },
        { status: 400 },
      );
    }

    const existing = await prisma.track.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const updated = await prisma.track.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(genre !== undefined && { genre }),
      },
      select: {
        id: true,
        title: true,
        genre: true,
        artist: { select: { id: true, name: true } },
        album: { select: { id: true, title: true } },
        durationSeconds: true,
        format: true,
      },
    });

    return NextResponse.json({ track: updated });
  },
);

export const DELETE = withAdmin(
  async (_req: NextRequest, _claims, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const track = await prisma.track.findUnique({
      where: { id },
      select: { id: true, albumId: true, artistId: true, title: true },
    });

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    await prisma.track.delete({ where: { id } });

    // Clean up orphaned artist/album if no other tracks reference them
    await cleanupOrphans(track.albumId, track.artistId);

    return NextResponse.json({ success: true, deletedId: id });
  },
);

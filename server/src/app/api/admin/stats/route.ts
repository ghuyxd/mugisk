/**
 * GET /api/admin/stats
 *
 * Admin-only endpoint. Returns aggregate statistics for the dashboard:
 *   - totalUsers, totalTracks, totalAlbums
 *   - storageBytes (sum of all track file sizes on disk)
 *   - recentUploads (tracks added in the last 24 h)
 *   - config (MUSIC_LIBRARY_PATH, aiKeyConfigured)
 */

import { NextResponse } from "next/server";
import fs from "fs";
import { withAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { isAiEnabled } from "@/lib/ai";

export const GET = withAdmin(async () => {
  const [totalUsers, totalTracks, totalAlbums, recentUploads, tracks] =
    await Promise.all([
      prisma.user.count(),
      prisma.track.count(),
      prisma.album.count(),
      prisma.track.count({
        where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } },
      }),
      // Fetch file paths to compute storage — limit to 5000 to avoid huge scans
      prisma.track.findMany({ select: { filePath: true }, take: 5000 }),
    ]);

  // Sum file sizes in parallel (best-effort; files may have moved)
  const sizes = await Promise.all(
    tracks.map((t) =>
      fs.promises
        .stat(t.filePath)
        .then((s) => s.size)
        .catch(() => 0),
    ),
  );
  const storageBytes = sizes.reduce((acc, s) => acc + s, 0);

  return NextResponse.json({
    totalUsers,
    totalTracks,
    totalAlbums,
    storageBytes,
    recentUploads,
    config: {
      musicLibraryPath: process.env.MUSIC_LIBRARY_PATH ?? null,
      aiKeyConfigured: isAiEnabled(),
    },
  });
});

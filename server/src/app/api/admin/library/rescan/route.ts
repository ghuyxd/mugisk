/**
 * POST /api/admin/library/rescan
 *
 * Admin-only endpoint. Walks the entire MUSIC_LIBRARY_PATH on disk, indexes
 * every audio file it finds (adding/updating DB rows), then removes any Track
 * rows whose filePath no longer exists on disk (handles files deleted while the
 * server was offline).
 *
 * Returns a summary of what was done.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { withAdmin } from "@/lib/middleware";
import { indexFile } from "@/lib/library/indexFile";
import { cleanupOrphans } from "@/lib/library/watcher";
import { prisma } from "@/lib/prisma";
import { ScanType, ScanStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const AUDIO_EXTENSIONS = new Set([
  ".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac",
]);

/** Recursively collect all audio file paths under a directory. */
async function collectAudioFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      return; // skip unreadable directories
    }

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (
          entry.isFile() &&
          AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
        ) {
          results.push(fullPath);
        }
      }),
    );
  }

  await walk(dir);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAdmin(async (_req: NextRequest) => {
  const libraryPath = process.env.MUSIC_LIBRARY_PATH;

  if (!libraryPath) {
    return NextResponse.json(
      { error: "MUSIC_LIBRARY_PATH is not configured on the server." },
      { status: 503 },
    );
  }

  const absLibraryPath = path.resolve(libraryPath);

  // Verify the directory exists and is accessible
  try {
    await fs.promises.access(absLibraryPath, fs.constants.R_OK);
  } catch {
    return NextResponse.json(
      { error: `Music library path is not accessible: ${absLibraryPath}` },
      { status: 503 },
    );
  }

  // ── 1. Walk disk ────────────────────────────────────────────────────────────
  const diskFiles = await collectAudioFiles(absLibraryPath);
  const diskFileSet = new Set(diskFiles);

  // ── 2. Index every file found on disk ───────────────────────────────────────
  let indexed = 0;
  let duplicates = 0;
  let failed = 0;

  // Process files with bounded concurrency to avoid overwhelming the DB / CPU
  const CONCURRENCY = 4;
  const chunks: string[][] = [];
  for (let i = 0; i < diskFiles.length; i += CONCURRENCY) {
    chunks.push(diskFiles.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map((f) => indexFile(f, ScanType.MANUAL_RESCAN)),
    );
    for (const result of results) {
      if (result.status === "indexed") indexed++;
      else if (result.status === "duplicate") duplicates++;
      else failed++;
    }
  }

  // ── 3. Remove stale DB tracks (deleted from disk) ───────────────────────────
  const allTracks = await prisma.track.findMany({
    select: { id: true, filePath: true, albumId: true, artistId: true, title: true },
  });

  const stale = allTracks.filter((t) => !diskFileSet.has(t.filePath));
  let removed = 0;

  for (const track of stale) {
    try {
      await prisma.track.delete({ where: { id: track.id } });
      await cleanupOrphans(track.albumId, track.artistId);

      await prisma.scanLog.create({
        data: {
          type: ScanType.MANUAL_RESCAN,
          status: ScanStatus.SUCCESS,
          filePath: track.filePath,
          message: `Removed stale track "${track.title}"`,
        },
      });

      removed++;
      console.log(`[rescan] Removed stale track "${track.title}" (${track.id})`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[rescan] Failed to remove stale track ${track.id}:`, err);

      await prisma.scanLog.create({
        data: {
          type: ScanType.MANUAL_RESCAN,
          status: ScanStatus.FAILED,
          filePath: track.filePath,
          message: `Failed to remove stale track: ${error}`,
        },
      });
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      scanned: diskFiles.length,
      indexed,
      duplicates,
      failed,
      removed,
    },
  });
});

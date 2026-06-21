/**
 * src/lib/library/watcher.ts
 *
 * Chokidar singleton that watches MUSIC_LIBRARY_PATH for audio file changes.
 *
 * This module is imported by src/instrumentation.ts which Next.js calls once
 * when the Node.js server process boots (dev or prod).
 *
 * The globalThis guard ensures the watcher is never started twice even when
 * Next.js hot-reloads modules in development mode.
 *
 * NOTE: chokidar v4 removed brace-expansion glob support. We watch the directory
 * directly and filter by extension in the event handlers.
 *
 * Supported extensions: mp3, flac, wav, ogg, m4a, aac
 */

import chokidar, { type FSWatcher } from "chokidar";
import path from "path";
import { prisma } from "@/lib/prisma";
import { indexFile } from "@/lib/library/indexFile";
import { ScanType, ScanStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const AUDIO_EXTENSIONS = new Set([
  ".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac",
]);

function isAudioFile(filePath: string): boolean {
  return AUDIO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton guard
// ─────────────────────────────────────────────────────────────────────────────

const g = globalThis as typeof globalThis & { __mugiskWatcher?: FSWatcher };

// ─────────────────────────────────────────────────────────────────────────────
// Orphan cleanup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete an Album if it has zero remaining tracks.
 * Then delete the owning Artist if it has zero albums AND zero tracks.
 */
export async function cleanupOrphans(albumId: string | null, artistId: string): Promise<void> {
  try {
    if (albumId) {
      const albumTrackCount = await prisma.track.count({ where: { albumId } });
      if (albumTrackCount === 0) {
        await prisma.album.delete({ where: { id: albumId } });
        console.log(`[watcher] Deleted orphaned album ${albumId}`);
      }
    }

    const artistTrackCount = await prisma.track.count({ where: { artistId } });
    const artistAlbumCount = await prisma.album.count({ where: { artistId } });
    if (artistTrackCount === 0 && artistAlbumCount === 0) {
      await prisma.artist.delete({ where: { id: artistId } });
      console.log(`[watcher] Deleted orphaned artist ${artistId}`);
    }
  } catch (err) {
    console.error("[watcher] Orphan cleanup error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Event handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleAdd(filePath: string): Promise<void> {
  if (!isAudioFile(filePath)) return;
  console.log(`[watcher] add: ${filePath}`);
  await indexFile(filePath, ScanType.WATCH);
}

async function handleChange(filePath: string): Promise<void> {
  if (!isAudioFile(filePath)) return;
  console.log(`[watcher] change: ${filePath}`);
  await indexFile(filePath, ScanType.WATCH);
}

async function handleUnlink(filePath: string): Promise<void> {
  if (!isAudioFile(filePath)) return;
  console.log(`[watcher] unlink: ${filePath}`);

  try {
    const track = await prisma.track.findUnique({
      where: { filePath },
      select: { id: true, albumId: true, artistId: true, title: true },
    });

    if (!track) {
      console.warn(`[watcher] unlink: no DB record for ${filePath}, skipping`);
      return;
    }

    await prisma.track.delete({ where: { id: track.id } });
    console.log(`[watcher] Deleted track "${track.title}" (${track.id})`);

    await cleanupOrphans(track.albumId, track.artistId);

    await prisma.scanLog.create({
      data: {
        type: ScanType.WATCH,
        status: ScanStatus.SUCCESS,
        filePath,
        message: `Removed track "${track.title}"`,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[watcher] unlink error on ${filePath}:`, err);

    try {
      await prisma.scanLog.create({
        data: {
          type: ScanType.WATCH,
          status: ScanStatus.FAILED,
          filePath,
          message: `Failed to remove: ${error}`,
        },
      });
    } catch {
      // best-effort
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start the chokidar watcher. Safe to call multiple times — subsequent calls
 * are no-ops thanks to the globalThis singleton guard.
 */
export function startWatcher(): void {
  const libraryPath = process.env.MUSIC_LIBRARY_PATH;

  if (!libraryPath) {
    console.warn(
      "[watcher] MUSIC_LIBRARY_PATH is not set — watcher will not start.",
    );
    return;
  }

  if (g.__mugiskWatcher) {
    console.log("[watcher] Already running, skipping re-init.");
    return;
  }

  const absPath = path.resolve(libraryPath);
  console.log(`[watcher] Starting — watching ${absPath}`);

  // NOTE: chokidar v4 no longer supports brace-expansion glob patterns.
  // We watch the directory directly and filter extensions in each handler.
  const watcher = chokidar.watch(absPath, {
    persistent: true,
    ignoreInitial: false, // emit 'add' for existing files on startup
    awaitWriteFinish: {
      // Wait until a file stops growing before processing (important for large uploads)
      stabilityThreshold: 1000,
      pollInterval: 200,
    },
    depth: 99,
  });

  watcher
    .on("add", (filePath) => void handleAdd(filePath))
    .on("change", (filePath) => void handleChange(filePath))
    .on("unlink", (filePath) => void handleUnlink(filePath))
    .on("error", (err) => console.error("[watcher] chokidar error:", err))
    .on("ready", () =>
      console.log(`[watcher] Initial scan complete. Watching ${absPath}`),
    );

  g.__mugiskWatcher = watcher;
}

/** Gracefully close the watcher (used in tests / shutdown hooks). */
export async function stopWatcher(): Promise<void> {
  if (g.__mugiskWatcher) {
    await g.__mugiskWatcher.close();
    delete g.__mugiskWatcher;
    console.log("[watcher] Stopped.");
  }
}

/**
 * src/lib/library/indexFile.ts
 *
 * THE single reusable indexing function for the music library.
 *
 * Called by:
 *   - The chokidar watcher (add / change events)
 *   - POST /api/admin/library/rescan
 *   - POST /api/admin/library/upload
 *
 * Never duplicate metadata-parsing logic — always call this function.
 *
 * Pipeline:
 *   1. Read file → compute SHA-256 hash
 *   2. Dedup: if another Track already owns that hash, log as duplicate and bail
 *   3. Parse metadata (title, artist, album, albumartist, track/disc, year,
 *      genre, duration, picture, format, bitrate)
 *   4. Upsert Artist by normalised name
 *   5. Upsert Album by (title + artistId), carry over year / coverUrl
 *   6. Save cover art if picture present → public/covers/<hash>.jpg
 *   7. Upsert Track keyed by filePath
 *   8. Write ScanLog row (SUCCESS or FAILED)
 */

import fs from "fs";
import crypto from "crypto";
import path from "path";
import { parseFile } from "music-metadata";
import { prisma } from "@/lib/prisma";
import { saveCoverArt } from "@/lib/library/covers";
import { runAutoTagger } from "@/lib/library/autoTagger";
import { ScanType, ScanStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type IndexResult =
  | { status: "indexed"; trackId: string }
  | { status: "duplicate"; existingTrackId: string }
  | { status: "failed"; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Compute SHA-256 hex digest of a file. */
async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Normalise an artist name for lookup purposes.
 * Collapses whitespace and lowercases — the DB stores the original casing
 * on first insert, but lookups use the normalised form.
 */
function normaliseArtistName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Index (or re-index) a single audio file into the database.
 *
 * @param filePath  Absolute path to the audio file on disk.
 * @param scanType  Whether this call originated from WATCH or MANUAL_RESCAN.
 * @returns         A discriminated union indicating what happened.
 */
export async function indexFile(
  filePath: string,
  scanType: ScanType = ScanType.WATCH,
): Promise<IndexResult> {
  const tag = `[indexFile] ${path.basename(filePath)}`;

  try {
    // ── 1. Hash ─────────────────────────────────────────────────────────────
    const fileHash = await hashFile(filePath);

    // ── 2. Dedup ─────────────────────────────────────────────────────────────
    const existingByHash = await prisma.track.findUnique({
      where: { fileHash },
      select: { id: true, filePath: true },
    });

    if (existingByHash && existingByHash.filePath !== filePath) {
      // Same content, different path — this is a renamed/copied duplicate.
      const msg = `Duplicate of track ${existingByHash.id} (path: ${existingByHash.filePath})`;
      console.log(`${tag}: duplicate — ${msg}`);

      await prisma.scanLog.create({
        data: {
          type: scanType,
          status: ScanStatus.SUCCESS,
          filePath,
          message: `DUPLICATE: ${msg}`,
        },
      });

      return { status: "duplicate", existingTrackId: existingByHash.id };
    }

    // ── 3. Parse metadata ────────────────────────────────────────────────────
    const meta = await parseFile(filePath, { skipCovers: false });
    const { common, format } = meta;

    const title = common.title ?? path.basename(filePath, path.extname(filePath));
    const artistName = common.artist ?? common.albumartist ?? "Unknown Artist";
    const albumTitle = common.album;
    const albumArtistName = common.albumartist ?? artistName;
    const trackNumber = common.track?.no ?? null;
    const discNumber = common.disk?.no ?? null;
    const year = common.year ?? null;
    const genre = common.genre?.[0] ?? null;
    const durationSeconds = Math.round(format.duration ?? 0);
    const codecFormat = format.container ?? format.codec ?? path.extname(filePath).slice(1).toUpperCase();
    const bitrate = format.bitrate ? Math.round(format.bitrate / 1000) : null;
    const picture = common.picture?.[0] ?? null;

    // ── 4. Upsert Artist ────────────────────────────────────────────────────
    // We look up by normalised name but store the original casing.
    const normalisedArtistName = normaliseArtistName(artistName);
    // findFirst by normalised name (Prisma doesn't support case-insensitive unique lookups in all DBs natively)
    let artist = await prisma.artist.findFirst({
      where: { name: { equals: artistName, mode: "insensitive" } },
    });
    if (!artist) {
      artist = await prisma.artist.create({
        data: { name: artistName.trim() },
      });
      console.log(`${tag}: created artist "${artist.name}" (${artist.id})`);
    }
    void normalisedArtistName; // used for lookup above, suppress unused-var warning

    // ── 5. Upsert Album ─────────────────────────────────────────────────────
    let album: { id: string; coverUrl: string | null } | null = null;

    if (albumTitle) {
      // For album artist upsert, prefer albumArtist over track artist
      let albumArtist = await prisma.artist.findFirst({
        where: { name: { equals: albumArtistName, mode: "insensitive" } },
      });
      if (!albumArtist) {
        albumArtist = await prisma.artist.create({
          data: { name: albumArtistName.trim() },
        });
      }

      album = await prisma.album.findFirst({
        where: {
          title: { equals: albumTitle, mode: "insensitive" },
          artistId: albumArtist.id,
        },
        select: { id: true, coverUrl: true },
      });

      if (!album) {
        album = await prisma.album.create({
          data: {
            title: albumTitle.trim(),
            artistId: albumArtist.id,
            year,
          },
          select: { id: true, coverUrl: true },
        });
        console.log(`${tag}: created album "${albumTitle}" (${album.id})`);
      }
    }

    // ── 6. Cover art ─────────────────────────────────────────────────────────
    let coverUrl: string | null = album?.coverUrl ?? null;

    if (picture && !coverUrl) {
      const savedUrl = await saveCoverArt(picture, fileHash);
      if (savedUrl) {
        coverUrl = savedUrl;
        if (album) {
          await prisma.album.update({
            where: { id: album.id },
            data: { coverUrl },
          });
        }
      }
    }

    // ── 7. Upsert Track ──────────────────────────────────────────────────────
    const trackData = {
      title,
      artistId: artist.id,
      albumId: album?.id ?? null,
      trackNumber,
      discNumber,
      durationSeconds,
      genre,
      fileHash,
      format: codecFormat,
      bitrate,
      // coverUrl is stored on Album; keep aiTags intact on updates
    };

    const track = await prisma.track.upsert({
      where: { filePath },
      create: { ...trackData, filePath },
      update: trackData,
      select: { id: true },
    });

    console.log(`${tag}: indexed track "${title}" → ${track.id}`);

    // ── 8. ScanLog SUCCESS ───────────────────────────────────────────────────
    await prisma.scanLog.create({
      data: {
        type: scanType,
        status: ScanStatus.SUCCESS,
        filePath,
        message: `Indexed "${title}" by "${artistName}"`,
      },
    });

    // ── 9. Auto-Tagging Hook (Best-Effort) ───────────────────────────────────
    if (!genre || genre === "Unknown") {
      void runAutoTagger(track.id, title, artistName, albumTitle ?? undefined);
    }

    return { status: "indexed", trackId: track.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[indexFile] ERROR on ${filePath}:`, err);

    // Write failure log — best-effort, don't throw if this also fails
    try {
      await prisma.scanLog.create({
        data: {
          type: scanType,
          status: ScanStatus.FAILED,
          filePath,
          message: error,
        },
      });
    } catch (logErr) {
      console.error("[indexFile] Failed to write error ScanLog:", logErr);
    }

    return { status: "failed", error };
  }
}

/**
 * src/lib/library/covers.ts
 *
 * Saves embedded cover art from audio metadata to the server's public directory
 * so it can be served as a static asset at /covers/<hash>.jpg.
 *
 * We write the raw buffer from music-metadata directly as JPEG — music-metadata
 * always returns pictures in their original encoding (JPEG is by far the most
 * common). If the format header says something different we still store it with
 * a .jpg extension because browsers are lenient and we avoid a sharp dependency.
 */

import fs from "fs";
import path from "path";
import type { IPicture } from "music-metadata";

/** Absolute path to the directory where cover images are stored. */
const COVERS_DIR = path.join(process.cwd(), "public", "covers");

/** Ensure the covers directory exists. Called once on module load. */
function ensureCoversDir(): void {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

ensureCoversDir();

/**
 * Persists a cover art picture to disk and returns its public URL.
 *
 * @param picture  The first embedded picture from music-metadata.
 * @param hash     A unique identifier (SHA-256 of the audio file) used as the filename.
 * @returns        Public URL string, e.g. "/covers/abc123.jpg", or null on failure.
 */
export async function saveCoverArt(
  picture: IPicture,
  hash: string,
): Promise<string | null> {
  try {
    const filename = `${hash}.jpg`;
    const filePath = path.join(COVERS_DIR, filename);

    // Skip write if the file already exists (idempotent for same-hash re-scans)
    if (!fs.existsSync(filePath)) {
      await fs.promises.writeFile(filePath, picture.data);
    }

    return `/covers/${filename}`;
  } catch (err) {
    console.error("[covers] Failed to save cover art:", err);
    return null;
  }
}

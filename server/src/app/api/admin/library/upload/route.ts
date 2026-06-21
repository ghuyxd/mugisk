/**
 * POST /api/admin/library/upload
 *
 * Admin-only endpoint. Accepts one or more audio files via multipart/form-data
 * (field name: "files"), writes them into MUSIC_LIBRARY_PATH, then immediately
 * calls indexFile so the track appears in the DB without waiting for the
 * chokidar watcher to fire.
 *
 * The watcher will also fire a short time later; the hash-based dedup in
 * indexFile ensures the second call is a safe no-op.
 *
 * Request:
 *   Content-Type: multipart/form-data
 *   Body:         files=<audio-file>[, files=<audio-file>, ...]
 *
 * Response:
 *   { results: Array<{ filename, status, trackId?, error? }> }
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { withAdmin } from "@/lib/middleware";
import { indexFile } from "@/lib/library/indexFile";
import { ScanType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const AUDIO_EXTENSIONS = new Set([
  ".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac",
]);

/** Max upload size per file: 200 MB */
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAdmin(async (req: NextRequest) => {
  const libraryPath = process.env.MUSIC_LIBRARY_PATH;

  if (!libraryPath) {
    return NextResponse.json(
      { error: "MUSIC_LIBRARY_PATH is not configured on the server." },
      { status: 503 },
    );
  }

  const absLibraryPath = path.resolve(libraryPath);

  // Ensure the library directory exists and is writable
  try {
    await fs.promises.access(absLibraryPath, fs.constants.W_OK);
  } catch {
    return NextResponse.json(
      { error: `Music library path is not writable: ${absLibraryPath}` },
      { status: 503 },
    );
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Failed to parse multipart form data." },
      { status: 400 },
    );
  }

  const files = formData.getAll("files");

  if (!files || files.length === 0) {
    return NextResponse.json(
      { error: "No files provided. Use field name \"files\"." },
      { status: 400 },
    );
  }

  const results: Array<{
    filename: string;
    status: string;
    trackId?: string;
    existingTrackId?: string;
    error?: string;
  }> = [];

  for (const file of files) {
    if (!(file instanceof File)) {
      results.push({ filename: "(unknown)", status: "failed", error: "Invalid field value — expected a File." });
      continue;
    }

    const filename = path.basename(file.name); // strip any path traversal
    const ext = path.extname(filename).toLowerCase();

    // Validate extension
    if (!AUDIO_EXTENSIONS.has(ext)) {
      results.push({
        filename,
        status: "failed",
        error: `Unsupported file type "${ext}". Allowed: ${[...AUDIO_EXTENSIONS].join(", ")}`,
      });
      continue;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      results.push({
        filename,
        status: "failed",
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 200 MB.`,
      });
      continue;
    }

    const destPath = path.join(absLibraryPath, filename);

    try {
      // Write to disk
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.promises.writeFile(destPath, buffer);
      console.log(`[upload] Wrote ${filename} → ${destPath}`);

      // Immediately index so the response reflects the result
      const result = await indexFile(destPath, ScanType.WATCH);

      if (result.status === "indexed") {
        results.push({ filename, status: "indexed", trackId: result.trackId });
      } else if (result.status === "duplicate") {
        results.push({ filename, status: "duplicate", existingTrackId: result.existingTrackId });
      } else {
        results.push({ filename, status: "failed", error: result.error });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[upload] Error processing ${filename}:`, err);
      results.push({ filename, status: "failed", error });
    }
  }

  return NextResponse.json({ results });
});

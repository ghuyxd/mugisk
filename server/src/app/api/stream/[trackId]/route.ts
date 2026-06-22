/**
 * GET /api/stream/:trackId
 *
 * Streams an audio file with full HTTP Range support (RFC 7233).
 *
 * ── Auth ─────────────────────────────────────────────────────────────────────
 * Two methods are accepted (checked in order):
 *   1. Authorization: Bearer <accessToken>   — standard API clients
 *   2. ?token=<streamToken>                  — for browser <audio> elements,
 *      which cannot set custom headers. The stream token is a short-lived JWT
 *      (5-min TTL) minted by POST /api/stream/token.
 *
 * ── Responses ────────────────────────────────────────────────────────────────
 * - No/invalid auth          → 401
 * - Track not found in DB    → 404
 * - File missing from disk   → 503 (DB is ahead of disk — rescan needed)
 * - Range request present    → 206 Partial Content with Content-Range header
 * - No Range header          → 200 with full file and Content-Length
 *
 * ── Range parsing ────────────────────────────────────────────────────────────
 * Handles the common "bytes=start-" and "bytes=start-end" forms.
 * Unsatisfiable ranges return 416 Range Not Satisfiable.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuthOrToken, AuthError } from "@/lib/middleware";

// Map stored format strings to MIME types
const FORMAT_MIME: Record<string, string> = {
  MPEG: "audio/mpeg",
  MP3: "audio/mpeg",
  FLAC: "audio/flac",
  OGG: "audio/ogg",
  VORBIS: "audio/ogg",
  WAV: "audio/wav",
  M4A: "audio/mp4",
  AAC: "audio/aac",
  MP4: "audio/mp4",
};

function getMimeType(format: string): string {
  return FORMAT_MIME[format.toUpperCase()] ?? "application/octet-stream";
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> },
): Promise<NextResponse> {
  // Auth: Bearer header OR ?token= query param
  try {
    await requireAuthOrToken(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  const { trackId } = await params;

  // Look up track in DB to get file path
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { filePath: true, format: true, durationSeconds: true },
  });

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  const absFilePath = path.resolve(track.filePath);

  // Check file exists on disk
  let fileSize: number;
  try {
    const stat = await fs.promises.stat(absFilePath);
    fileSize = stat.size;
  } catch {
    return NextResponse.json(
      { error: "Audio file not found on disk. Rescan the library." },
      { status: 503 },
    );
  }

  const mimeType = getMimeType(track.format);
  const rangeHeader = req.headers.get("range");

  // ── Full-file response (no Range header) ───────────────────────────────────
  if (!rangeHeader) {
    const stream = fs.createReadStream(absFilePath);
    const body = stream as unknown as ReadableStream;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  }

  // ── Ranged response (206 Partial Content) ──────────────────────────────────
  // Parse "bytes=start-[end]"
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${fileSize}`,
      },
    });
  }

  const rawStart = match[1];
  const rawEnd = match[2];

  let start = rawStart !== "" ? parseInt(rawStart, 10) : 0;
  let end = rawEnd !== "" ? parseInt(rawEnd, 10) : fileSize - 1;

  // Clamp end to file boundary
  if (end >= fileSize) end = fileSize - 1;

  // Validate range
  if (start > end || start < 0) {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${fileSize}`,
      },
    });
  }

  const chunkSize = end - start + 1;
  const stream = fs.createReadStream(absFilePath, { start, end });
  const body = stream as unknown as ReadableStream;

  return new NextResponse(body, {
    status: 206,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": chunkSize.toString(),
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}

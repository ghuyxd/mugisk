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
import { Readable } from "stream";
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

// ── Stream Helper ────────────────────────────────────────────────────────────
function nodeStreamToWebStream(nodeStream: fs.ReadStream): ReadableStream {
  let isCancelled = false;
  const iterator = nodeStream[Symbol.asyncIterator]();

  return new ReadableStream({
    async pull(controller) {
      if (isCancelled) return;
      try {
        const { value, done } = await iterator.next();
        if (isCancelled) return;
        if (done) {
          controller.close();
        } else {
          // Node Buffers can be passed directly to Uint8Array safely
          controller.enqueue(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
        }
      } catch (error) {
        if (isCancelled) return;
        try { controller.error(error); } catch (_) { }
      }
    },
    cancel() {
      isCancelled = true;
      nodeStream.destroy();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> },
): Promise<NextResponse> {

  try {
    await requireAuthOrToken(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  const { trackId } = await params;

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { filePath: true, format: true },
  });

  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

  const absFilePath = path.resolve(track.filePath);

  let fileSize: number;
  try {
    const stat = await fs.promises.stat(absFilePath);
    fileSize = stat.size;
  } catch {
    return NextResponse.json({ error: "Audio file not found on disk." }, { status: 503 });
  }

  const mimeType = getMimeType(track.format);
  const rangeHeader = req.headers.get("range");

  // ── FULL FILE RESPONSE (200) ───────────────────────────────────
  if (!rangeHeader) {
    const nodeStream = fs.createReadStream(absFilePath);
    const webStream = Readable.toWeb(nodeStream);

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  }

  // ── RANGED RESPONSE (206) ──────────────────────────────────
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) {
    return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${fileSize}` },
    });
  }

  const rawStart = match[1];
  const rawEnd = match[2];

  let start = rawStart !== "" ? parseInt(rawStart, 10) : 0;
  let end = rawEnd !== "" ? parseInt(rawEnd, 10) : fileSize - 1;

  if (end >= fileSize) end = fileSize - 1;

  if (start > end || start < 0) {
    return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${fileSize}` },
    });
  }

  const chunkSize = end - start + 1;

  // Đã XÓA bỏ dòng req.signal.abort cũ để tránh lỗi "Controller is already closed"
  const nodeStream = fs.createReadStream(absFilePath, { start, end });
  const webStream = Readable.toWeb(nodeStream);

  return new NextResponse(webStream as any, {
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
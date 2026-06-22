/**
 * POST /api/playlists   — Create a new playlist
 * GET  /api/playlists   — List the authenticated user's playlists (paginated)
 *
 * Requires a valid access token.
 *
 * POST body:
 *   { name: string; isPublic?: boolean }
 *
 * GET query params:
 *   page  (default 1)
 *   limit (default 20, max 100)
 *
 * GET response:
 *   { data: Playlist[], meta: { total, page, pageSize, totalPages } }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, "name is required").max(200),
  isPublic: z.boolean().default(false),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/playlists
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let claims;
  try {
    claims = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, isPublic } = parsed.data;

  const playlist = await prisma.playlist.create({
    data: { name, isPublic, userId: claims.userId },
    select: {
      id: true,
      name: true,
      isPublic: true,
      createdAt: true,
      _count: { select: { tracks: true } },
    },
  });

  return NextResponse.json(playlist, { status: 201 });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/playlists
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  let claims;
  try {
    claims = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    throw err;
  }

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const [playlists, total] = await Promise.all([
    prisma.playlist.findMany({
      where: { userId: claims.userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isPublic: true,
        createdAt: true,
        _count: { select: { tracks: true } },
      },
    }),
    prisma.playlist.count({ where: { userId: claims.userId } }),
  ]);

  return NextResponse.json({
    data: playlists,
    meta: {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

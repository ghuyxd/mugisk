/**
 * src/__tests__/library-read.integration.test.ts
 *
 * Integration tests for Phase 4 — Library Read API & Audio Streaming.
 * Runs against a live Next.js dev server (port 3001 by default).
 *
 * NOTE: The auth integration test also starts a server on port 3001, so run
 * these suites separately or configure TEST_BASE_URL in the environment.
 *
 * Prerequisites:
 *   - PostgreSQL running (Docker Compose stack)
 *   - DATABASE_URL pointing at a test-accessible database
 *   - JWT_SECRET set in env
 *   - MUSIC_LIBRARY_PATH set (or tests stub it out via DB rows only)
 *
 * Run:
 *   pnpm --filter @mugisk/server test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { exec, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const SERVER_START_TIMEOUT = 30_000;

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function request(
  method: string,
  urlPath: string,
  {
    body,
    token,
    headers: extraHeaders = {},
  }: { body?: unknown; token?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; data: unknown; headers: Headers }> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

async function get(urlPath: string, token?: string, extraHeaders?: Record<string, string>) {
  return request("GET", urlPath, { token, headers: extraHeaders });
}
async function post(urlPath: string, body: unknown, token?: string) {
  return request("POST", urlPath, { body, token });
}
async function patch(urlPath: string, body: unknown, token?: string) {
  return request("PATCH", urlPath, { body, token });
}
async function del(urlPath: string, token?: string) {
  return request("DELETE", urlPath, { token });
}

/** Wait for the dev server to become healthy. */
async function waitForServer(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Dev server did not become ready within ${timeoutMs}ms`);
}

// ── Test data IDs ─────────────────────────────────────────────────────────────

const TS = Date.now().toString().slice(-8);
const TEST_EMAIL = `lib_${TS}@example.com`;
const TEST_USERNAME = `lib_${TS}`;
const TEST_PASSWORD = "TestPass123";

// IDs populated in beforeAll
let accessToken: string;
let artistId: string;
let albumId: string;
let trackId1: string;
let trackId2: string;
// Absolute path to the tiny stub audio file we write to disk for streaming tests
let stubAudioPath: string;

// ── Server lifecycle ──────────────────────────────────────────────────────────

let serverProcess: ChildProcess | null = null;

beforeAll(async () => {
  // ── 1. Clean up any leftover data ──────────────────────────────────────────
  await prisma.playHistory.deleteMany({
    where: { user: { email: { contains: "example.com" } } },
  });
  await prisma.playlistTrack.deleteMany({
    where: { playlist: { user: { email: { contains: "example.com" } } } },
  });
  await prisma.playlist.deleteMany({
    where: { user: { email: { contains: "example.com" } } },
  });
  await prisma.session.deleteMany({
    where: { user: { email: { contains: "example.com" } } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: "example.com" } },
  });
  // Clean test artists/albums/tracks if they exist from a previous run
  await prisma.track.deleteMany({ where: { title: { startsWith: "__test__" } } });
  await prisma.album.deleteMany({ where: { title: { startsWith: "__test__" } } });
  await prisma.artist.deleteMany({ where: { name: { startsWith: "__test__" } } });

  // ── 2. Create a stub audio file (minimal valid WAV header — 44 bytes) ───────
  // This lets the stream endpoint actually open and read a real file.
  const libraryPath = process.env.MUSIC_LIBRARY_PATH ?? "/tmp";
  stubAudioPath = path.join(path.resolve(libraryPath), `__test_stub_${TS}.wav`);

  // Minimal WAV: RIFF header (44 bytes) + a few silent PCM bytes so Range
  // requests have something to slice into.
  const wavBuffer = Buffer.alloc(1100, 0);
  wavBuffer.write("RIFF", 0);
  wavBuffer.writeUInt32LE(1092, 4);       // chunk size
  wavBuffer.write("WAVE", 8);
  wavBuffer.write("fmt ", 12);
  wavBuffer.writeUInt32LE(16, 16);        // subchunk size
  wavBuffer.writeUInt16LE(1, 20);         // PCM
  wavBuffer.writeUInt16LE(1, 22);         // mono
  wavBuffer.writeUInt32LE(44100, 24);     // sample rate
  wavBuffer.writeUInt32LE(88200, 28);     // byte rate
  wavBuffer.writeUInt16LE(2, 32);         // block align
  wavBuffer.writeUInt16LE(16, 34);        // bits per sample
  wavBuffer.write("data", 36);
  wavBuffer.writeUInt32LE(1056, 40);      // data size
  fs.writeFileSync(stubAudioPath, wavBuffer);

  // ── 3. Seed library data directly in DB ──────────────────────────────────
  const artist = await prisma.artist.create({
    data: { name: "__test__Artist" },
  });
  artistId = artist.id;

  const album = await prisma.album.create({
    data: {
      title: "__test__Album",
      artistId,
      year: 2024,
    },
  });
  albumId = album.id;

  const track1 = await prisma.track.create({
    data: {
      title: "__test__Track One",
      artistId,
      albumId,
      trackNumber: 1,
      discNumber: 1,
      durationSeconds: 210,
      genre: "TestGenre",
      filePath: stubAudioPath,
      fileHash: `testhash_${TS}_1`,
      format: "WAV",
    },
  });
  trackId1 = track1.id;

  const track2 = await prisma.track.create({
    data: {
      title: "__test__Track Two",
      artistId,
      albumId,
      trackNumber: 2,
      discNumber: 1,
      durationSeconds: 180,
      genre: "TestGenre",
      filePath: stubAudioPath + "_two", // second track points to nonexistent — fine for non-stream tests
      fileHash: `testhash_${TS}_2`,
      format: "WAV",
    },
  });
  trackId2 = track2.id;

  // ── 4. Start dev server ────────────────────────────────────────────────────
  serverProcess = exec("PORT=3001 node_modules/.bin/next dev --port 3001", {
    cwd: process.cwd(),
    env: { ...process.env },
  });

  await waitForServer(SERVER_START_TIMEOUT);

  // ── 5. Register + login test user ─────────────────────────────────────────
  await post("/api/auth/register", {
    email: TEST_EMAIL,
    username: TEST_USERNAME,
    password: TEST_PASSWORD,
  });

  const { data: loginData } = await post("/api/auth/login", {
    identifier: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  accessToken = (loginData as { accessToken: string }).accessToken;
}, SERVER_START_TIMEOUT + 15_000);

afterAll(async () => {
  if (serverProcess) serverProcess.kill("SIGTERM");

  // Remove stub file
  try {
    fs.unlinkSync(stubAudioPath);
  } catch { /* ignore */ }

  // Clean up test data
  await prisma.playHistory.deleteMany({
    where: { user: { email: { contains: "example.com" } } },
  });
  await prisma.playlistTrack.deleteMany({
    where: { playlist: { user: { email: { contains: "example.com" } } } },
  });
  await prisma.playlist.deleteMany({
    where: { user: { email: { contains: "example.com" } } },
  });
  await prisma.session.deleteMany({
    where: { user: { email: { contains: "example.com" } } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: "example.com" } },
  });
  await prisma.track.deleteMany({ where: { title: { startsWith: "__test__" } } });
  await prisma.album.deleteMany({ where: { title: { startsWith: "__test__" } } });
  await prisma.artist.deleteMany({ where: { name: { startsWith: "__test__" } } });

  await prisma.$disconnect();
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/tracks
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/tracks", () => {
  it("returns 401 without a token", async () => {
    const { status } = await get("/api/tracks");
    expect(status).toBe(401);
  });

  it("returns paginated tracks with meta", async () => {
    const { status, data } = await get("/api/tracks", accessToken);
    expect(status).toBe(200);
    const d = data as { data: unknown[]; meta: { total: number; page: number; pageSize: number; totalPages: number } };
    expect(Array.isArray(d.data)).toBe(true);
    expect(typeof d.meta.total).toBe("number");
    expect(d.meta.page).toBe(1);
    expect(typeof d.meta.pageSize).toBe("number");
    expect(typeof d.meta.totalPages).toBe("number");
  });

  it("paginates correctly with page and limit", async () => {
    const { status, data } = await get("/api/tracks?page=1&limit=1", accessToken);
    expect(status).toBe(200);
    const d = data as { data: unknown[]; meta: { pageSize: number } };
    expect(d.data.length).toBeLessThanOrEqual(1);
    expect(d.meta.pageSize).toBe(1);
  });

  it("filters by search (title match)", async () => {
    const { status, data } = await get("/api/tracks?search=__test__Track", accessToken);
    expect(status).toBe(200);
    const d = data as { data: Array<{ title: string }> };
    expect(d.data.length).toBeGreaterThanOrEqual(2);
    expect(d.data.every((t) => t.title.includes("__test__"))).toBe(true);
  });

  it("filters by genre", async () => {
    const { status, data } = await get("/api/tracks?genre=TestGenre", accessToken);
    expect(status).toBe(200);
    const d = data as { data: Array<{ genre: string }> };
    expect(d.data.length).toBeGreaterThanOrEqual(2);
    expect(d.data.every((t) => t.genre === "TestGenre")).toBe(true);
  });

  it("filters by albumId", async () => {
    const { status, data } = await get(`/api/tracks?albumId=${albumId}`, accessToken);
    expect(status).toBe(200);
    const d = data as { data: Array<{ album: { id: string } }> };
    expect(d.data.length).toBeGreaterThanOrEqual(2);
    expect(d.data.every((t) => t.album?.id === albumId)).toBe(true);
  });

  it("filters by artistId", async () => {
    const { status, data } = await get(`/api/tracks?artistId=${artistId}`, accessToken);
    expect(status).toBe(200);
    const d = data as { data: Array<{ artist: { id: string } }> };
    expect(d.data.every((t) => t.artist.id === artistId)).toBe(true);
  });

  it("returns 400 for invalid limit", async () => {
    const { status } = await get("/api/tracks?limit=999", accessToken);
    expect(status).toBe(400);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/albums
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/albums", () => {
  it("returns 401 without a token", async () => {
    const { status } = await get("/api/albums");
    expect(status).toBe(401);
  });

  it("returns paginated albums with meta", async () => {
    const { status, data } = await get("/api/albums", accessToken);
    expect(status).toBe(200);
    const d = data as { data: unknown[]; meta: { total: number } };
    expect(Array.isArray(d.data)).toBe(true);
    expect(typeof d.meta.total).toBe("number");
  });

  it("filters by artistId", async () => {
    const { status, data } = await get(`/api/albums?artistId=${artistId}`, accessToken);
    expect(status).toBe(200);
    const d = data as { data: Array<{ id: string }> };
    expect(d.data.some((a) => a.id === albumId)).toBe(true);
  });

  it("filters by search", async () => {
    const { status, data } = await get("/api/albums?search=__test__Album", accessToken);
    expect(status).toBe(200);
    const d = data as { data: Array<{ title: string }> };
    expect(d.data.some((a) => a.title === "__test__Album")).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/albums/:id
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/albums/:id", () => {
  it("returns 401 without a token", async () => {
    const { status } = await get(`/api/albums/${albumId}`);
    expect(status).toBe(401);
  });

  it("returns album with ordered tracks", async () => {
    const { status, data } = await get(`/api/albums/${albumId}`, accessToken);
    expect(status).toBe(200);
    const d = data as {
      id: string;
      title: string;
      tracks: Array<{ id: string; trackNumber: number }>;
    };
    expect(d.id).toBe(albumId);
    expect(d.title).toBe("__test__Album");
    expect(Array.isArray(d.tracks)).toBe(true);
    expect(d.tracks.length).toBeGreaterThanOrEqual(2);
    // Tracks should be in disc/track order
    expect(d.tracks[0]!.trackNumber).toBeLessThanOrEqual(d.tracks[1]!.trackNumber!);
  });

  it("returns 404 for unknown id", async () => {
    const { status } = await get("/api/albums/nonexistent-album-id", accessToken);
    expect(status).toBe(404);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/artists + GET /api/artists/:id
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/artists", () => {
  it("returns 401 without a token", async () => {
    const { status } = await get("/api/artists");
    expect(status).toBe(401);
  });

  it("returns paginated artists", async () => {
    const { status, data } = await get("/api/artists", accessToken);
    expect(status).toBe(200);
    const d = data as { data: unknown[]; meta: { total: number } };
    expect(Array.isArray(d.data)).toBe(true);
    expect(typeof d.meta.total).toBe("number");
  });

  it("filters by search", async () => {
    const { status, data } = await get("/api/artists?search=__test__", accessToken);
    expect(status).toBe(200);
    const d = data as { data: Array<{ id: string }> };
    expect(d.data.some((a) => a.id === artistId)).toBe(true);
  });
});

describe("GET /api/artists/:id", () => {
  it("returns artist with albums", async () => {
    const { status, data } = await get(`/api/artists/${artistId}`, accessToken);
    expect(status).toBe(200);
    const d = data as {
      id: string;
      name: string;
      albums: Array<{ id: string; title: string }>;
    };
    expect(d.id).toBe(artistId);
    expect(d.name).toBe("__test__Artist");
    expect(Array.isArray(d.albums)).toBe(true);
    expect(d.albums.some((a) => a.id === albumId)).toBe(true);
  });

  it("returns 404 for unknown id", async () => {
    const { status } = await get("/api/artists/nonexistent-id", accessToken);
    expect(status).toBe(404);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/genres
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/genres", () => {
  it("returns 401 without a token", async () => {
    const { status } = await get("/api/genres");
    expect(status).toBe(401);
  });

  it("returns distinct genres with track counts", async () => {
    const { status, data } = await get("/api/genres", accessToken);
    expect(status).toBe(200);
    const d = data as { data: Array<{ genre: string; trackCount: number }> };
    expect(Array.isArray(d.data)).toBe(true);
    const testGenre = d.data.find((g) => g.genre === "TestGenre");
    expect(testGenre).toBeDefined();
    expect(testGenre!.trackCount).toBeGreaterThanOrEqual(2);
  });

  it("excludes null genres", async () => {
    const { status, data } = await get("/api/genres", accessToken);
    expect(status).toBe(200);
    const d = data as { data: Array<{ genre: string | null }> };
    expect(d.data.every((g) => g.genre !== null)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/stream/:trackId (audio streaming)
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/stream/:trackId", () => {
  it("returns 401 without any auth", async () => {
    const { status } = await get(`/api/stream/${trackId1}`);
    expect(status).toBe(401);
  });

  it("returns 404 for an unknown trackId", async () => {
    const { status } = await get("/api/stream/nonexistent-track-id", accessToken);
    expect(status).toBe(404);
  });

  it("returns 200 with full file when no Range header", async () => {
    const res = await fetch(`${BASE_URL}/api/stream/${trackId1}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Accept-Ranges")).toBe("bytes");
    expect(res.headers.get("Content-Type")).toMatch(/audio/);
    const contentLength = Number(res.headers.get("Content-Length"));
    expect(contentLength).toBeGreaterThan(0);
    // Drain body
    await res.arrayBuffer();
  });

  it("returns 206 with correct partial content for Range: bytes=0-99", async () => {
    const res = await fetch(`${BASE_URL}/api/stream/${trackId1}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Range: "bytes=0-99",
      },
    });
    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Range")).toMatch(/^bytes 0-99\//);
    expect(res.headers.get("Content-Length")).toBe("100");
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBe(100);
  });

  it("returns 206 for open-ended Range: bytes=1000-", async () => {
    const res = await fetch(`${BASE_URL}/api/stream/${trackId1}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Range: "bytes=1000-",
      },
    });
    expect(res.status).toBe(206);
    const contentRange = res.headers.get("Content-Range");
    expect(contentRange).toMatch(/^bytes 1000-/);
    await res.arrayBuffer();
  });

  it("returns 416 for an unsatisfiable range", async () => {
    const res = await fetch(`${BASE_URL}/api/stream/${trackId1}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Range: "bytes=999999999-",
      },
    });
    expect(res.status).toBe(416);
    expect(res.headers.get("Content-Range")).toMatch(/^\*/);
  });

  it("accepts auth via ?token= query parameter", async () => {
    // Mint a stream token
    const { status: mintStatus, data: mintData } = await post(
      "/api/stream/token",
      {},
      accessToken,
    );
    expect(mintStatus).toBe(200);
    const { token } = mintData as { token: string; expiresIn: number };
    expect(typeof token).toBe("string");

    // Use it as query param — no Authorization header
    const res = await fetch(`${BASE_URL}/api/stream/${trackId1}?token=${token}`);
    expect(res.status).toBe(200);
    await res.arrayBuffer();
  });

  it("rejects an expired/invalid ?token=", async () => {
    const res = await fetch(
      `${BASE_URL}/api/stream/${trackId1}?token=totally.invalid.token`,
    );
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/stream/token
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/stream/token", () => {
  it("requires auth", async () => {
    const { status } = await post("/api/stream/token", {});
    expect(status).toBe(401);
  });

  it("returns a token and expiresIn=300", async () => {
    const { status, data } = await post("/api/stream/token", {}, accessToken);
    expect(status).toBe(200);
    const d = data as { token: string; expiresIn: number };
    expect(typeof d.token).toBe("string");
    expect(d.expiresIn).toBe(300);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Playlist CRUD
// ═════════════════════════════════════════════════════════════════════════════

describe("Playlist CRUD", () => {
  let playlistId: string;

  describe("POST /api/playlists (create)", () => {
    it("returns 401 without auth", async () => {
      const { status } = await post("/api/playlists", { name: "Test" });
      expect(status).toBe(401);
    });

    it("creates a playlist and returns 201", async () => {
      const { status, data } = await post(
        "/api/playlists",
        { name: "My Test Playlist", isPublic: false },
        accessToken,
      );
      expect(status).toBe(201);
      const d = data as { id: string; name: string; isPublic: boolean };
      expect(typeof d.id).toBe("string");
      expect(d.name).toBe("My Test Playlist");
      expect(d.isPublic).toBe(false);
      playlistId = d.id;
    });

    it("returns 400 for missing name", async () => {
      const { status } = await post("/api/playlists", {}, accessToken);
      expect(status).toBe(400);
    });
  });

  describe("GET /api/playlists (list)", () => {
    it("returns the user's playlists with pagination meta", async () => {
      const { status, data } = await get("/api/playlists", accessToken);
      expect(status).toBe(200);
      const d = data as { data: Array<{ id: string }>; meta: { total: number } };
      expect(d.data.some((p) => p.id === playlistId)).toBe(true);
      expect(typeof d.meta.total).toBe("number");
    });
  });

  describe("GET /api/playlists/:id", () => {
    it("returns the playlist with tracks array", async () => {
      const { status, data } = await get(`/api/playlists/${playlistId}`, accessToken);
      expect(status).toBe(200);
      const d = data as { id: string; tracks: unknown[] };
      expect(d.id).toBe(playlistId);
      expect(Array.isArray(d.tracks)).toBe(true);
    });

    it("returns 404 for unknown id", async () => {
      const { status } = await get("/api/playlists/nonexistent", accessToken);
      expect(status).toBe(404);
    });
  });

  describe("POST /api/playlists/:id/tracks (add track)", () => {
    it("adds track1 at position 0", async () => {
      const { status, data } = await post(
        `/api/playlists/${playlistId}/tracks`,
        { trackId: trackId1 },
        accessToken,
      );
      expect(status).toBe(201);
      const d = data as { position: number; trackId: string };
      expect(d.position).toBe(0);
      expect(d.trackId).toBe(trackId1);
    });

    it("adds track2 at position 1", async () => {
      const { status, data } = await post(
        `/api/playlists/${playlistId}/tracks`,
        { trackId: trackId2 },
        accessToken,
      );
      expect(status).toBe(201);
      const d = data as { position: number };
      expect(d.position).toBe(1);
    });

    it("returns 409 for a duplicate track", async () => {
      const { status } = await post(
        `/api/playlists/${playlistId}/tracks`,
        { trackId: trackId1 },
        accessToken,
      );
      expect(status).toBe(409);
    });

    it("returns 404 for a nonexistent track", async () => {
      const { status } = await post(
        `/api/playlists/${playlistId}/tracks`,
        { trackId: "nonexistent-track-id" },
        accessToken,
      );
      expect(status).toBe(404);
    });
  });

  describe("GET /api/playlists/:id (with tracks)", () => {
    it("returns tracks in position order", async () => {
      const { status, data } = await get(`/api/playlists/${playlistId}`, accessToken);
      expect(status).toBe(200);
      const d = data as { tracks: Array<{ position: number; id: string }> };
      expect(d.tracks.length).toBe(2);
      expect(d.tracks[0]!.position).toBe(0);
      expect(d.tracks[0]!.id).toBe(trackId1);
      expect(d.tracks[1]!.position).toBe(1);
      expect(d.tracks[1]!.id).toBe(trackId2);
    });
  });

  describe("PATCH /api/playlists/:id/reorder", () => {
    it("reorders tracks and returns 200", async () => {
      // Swap order: track2 first, track1 second
      const { status, data } = await patch(
        `/api/playlists/${playlistId}/reorder`,
        { trackIds: [trackId2, trackId1] },
        accessToken,
      );
      expect(status).toBe(200);
      expect((data as { message: string }).message).toContain("Reordered");
    });

    it("reflects new order in GET", async () => {
      const { data } = await get(`/api/playlists/${playlistId}`, accessToken);
      const d = data as { tracks: Array<{ position: number; id: string }> };
      expect(d.tracks[0]!.id).toBe(trackId2);
      expect(d.tracks[0]!.position).toBe(0);
      expect(d.tracks[1]!.id).toBe(trackId1);
      expect(d.tracks[1]!.position).toBe(1);
    });

    it("returns 400 if trackIds set doesn't match playlist", async () => {
      const { status } = await patch(
        `/api/playlists/${playlistId}/reorder`,
        { trackIds: [trackId1] }, // missing trackId2
        accessToken,
      );
      expect(status).toBe(400);
    });

    it("returns 400 for duplicate trackIds", async () => {
      const { status } = await patch(
        `/api/playlists/${playlistId}/reorder`,
        { trackIds: [trackId1, trackId1] },
        accessToken,
      );
      expect(status).toBe(400);
    });
  });

  describe("DELETE /api/playlists/:id/tracks/:trackId", () => {
    it("removes track1 and compacts positions", async () => {
      const { status } = await del(
        `/api/playlists/${playlistId}/tracks/${trackId1}`,
        accessToken,
      );
      expect(status).toBe(204);

      // track2 should now be at position 0
      const { data } = await get(`/api/playlists/${playlistId}`, accessToken);
      const d = data as { tracks: Array<{ position: number; id: string }> };
      expect(d.tracks.length).toBe(1);
      expect(d.tracks[0]!.id).toBe(trackId2);
      expect(d.tracks[0]!.position).toBe(0);
    });

    it("returns 404 for a track not in the playlist", async () => {
      const { status } = await del(
        `/api/playlists/${playlistId}/tracks/${trackId1}`, // already removed
        accessToken,
      );
      expect(status).toBe(404);
    });
  });

  describe("PATCH /api/playlists/:id (rename/update)", () => {
    it("renames the playlist", async () => {
      const { status, data } = await patch(
        `/api/playlists/${playlistId}`,
        { name: "Renamed Playlist" },
        accessToken,
      );
      expect(status).toBe(200);
      expect((data as { name: string }).name).toBe("Renamed Playlist");
    });

    it("toggles isPublic", async () => {
      const { status, data } = await patch(
        `/api/playlists/${playlistId}`,
        { isPublic: true },
        accessToken,
      );
      expect(status).toBe(200);
      expect((data as { isPublic: boolean }).isPublic).toBe(true);
    });

    it("returns 400 when body has no recognized fields", async () => {
      const { status } = await patch(
        `/api/playlists/${playlistId}`,
        {},
        accessToken,
      );
      expect(status).toBe(400);
    });
  });

  describe("DELETE /api/playlists/:id", () => {
    it("deletes the playlist and returns 204", async () => {
      const { status } = await del(`/api/playlists/${playlistId}`, accessToken);
      expect(status).toBe(204);
    });

    it("returns 404 after deletion", async () => {
      const { status } = await get(`/api/playlists/${playlistId}`, accessToken);
      expect(status).toBe(404);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/history
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/history", () => {
  it("returns 401 without auth", async () => {
    const { status } = await post("/api/history", { trackId: trackId1 });
    expect(status).toBe(401);
  });

  it("logs a play history row and returns 204", async () => {
    const { status } = await post("/api/history", { trackId: trackId1 }, accessToken);
    expect(status).toBe(204);

    // Verify the row was written
    const row = await prisma.playHistory.findFirst({
      where: { trackId: trackId1 },
      orderBy: { playedAt: "desc" },
    });
    expect(row).not.toBeNull();
    expect(row!.trackId).toBe(trackId1);
  });

  it("returns 404 for a nonexistent track", async () => {
    const { status } = await post(
      "/api/history",
      { trackId: "nonexistent-track-id" },
      accessToken,
    );
    expect(status).toBe(404);
  });

  it("returns 400 for missing trackId", async () => {
    const { status } = await post("/api/history", {}, accessToken);
    expect(status).toBe(400);
  });
});

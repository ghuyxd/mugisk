import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAiEnabled, getAiClient } from "@/lib/ai";
import { withAuth } from "@/lib/middleware";

export const POST = withAuth(async (req, claims) => {
  if (!isAiEnabled()) {
    return NextResponse.json({ error: "AI disabled" }, { status: 403 });
  }

  const ai = getAiClient();
  if (!ai) {
    return NextResponse.json({ error: "AI client error" }, { status: 500 });
  }

  try {
    // 1. Fetch play history
    const history = await prisma.playHistory.findMany({
      where: { userId: claims.userId },
      orderBy: { playedAt: "desc" },
      include: {
        track: {
          include: { artist: true },
        },
      },
      take: 50,
    });

    // Deduplicate history tracks to get top 20 distinct recent tracks
    const historyTracksMap = new Map();
    for (const h of history) {
      if (!historyTracksMap.has(h.trackId)) {
        historyTracksMap.set(h.trackId, h.track);
      }
      if (historyTracksMap.size >= 20) break;
    }

    let seedTracks = Array.from(historyTracksMap.values());
    const recentlyPlayedIds = seedTracks.map((t) => t.id);

    // 2. Fallback to random if empty
    if (seedTracks.length === 0) {
      // Just take latest 10 tracks as fallback
      seedTracks = await prisma.track.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { artist: true },
      });
    }

    if (seedTracks.length === 0) {
      return NextResponse.json({ error: "Library is empty" }, { status: 400 });
    }

    const contextList = seedTracks
      .map((t) => `- "${t.title}" by ${t.artist.name} (Genre: ${t.genre || "Unknown"}, Tags: ${t.aiTags.join(",")})`)
      .join("\n");

    const prompt = `Based on the following recent listening history of a user, propose a concept for a new smart playlist.
History:
${contextList}

Return a strictly formatted JSON object with this schema:
{
  "title": "A short, catchy playlist title (e.g. 'Late Night Lofi')",
  "description": "A 1-2 sentence description",
  "criteria": {
    "genres": ["genre1", "genre2"],
    "moods": ["mood1", "mood2"]
  }
}
Do not include any markdown wrapping, just the raw JSON.`;

    const model = process.env.AI_MODEL || "gpt-3.5-turbo";

    const response = await ai.chat.completions.create({
      model,
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "{}";
    const cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
    
    let playlistInfo;
    try {
      playlistInfo = JSON.parse(cleaned);
    } catch (e) {
      console.error("[ai/smart-playlist] JSON parse failed", content);
      return NextResponse.json({ error: "Failed to generate playlist structure" }, { status: 500 });
    }

    const { title, description, criteria = {} } = playlistInfo;
    const { genres = [], moods = [] } = criteria;
    const searchTerms = [...genres, ...moods].map((t: string) => t.toLowerCase());

    // 4. Reconcile Loop
    const orConditions: any[] = [];
    for (const term of searchTerms) {
      orConditions.push({ genre: { contains: term, mode: 'insensitive' } });
      orConditions.push({ aiTags: { has: term } });
    }

    // fallback to everything if criteria is empty
    const whereClause = orConditions.length > 0 ? { OR: orConditions } : {};

    let candidates = await prisma.track.findMany({
      where: whereClause,
      take: 100,
    });

    // Deduplicate against heavily played
    candidates = candidates.filter((c) => !recentlyPlayedIds.includes(c.id));

    // If we filtered out too many, just take from general pool
    if (candidates.length < 10) {
      const extra = await prisma.track.findMany({ take: 15 });
      candidates = [...candidates, ...extra.filter((c) => !recentlyPlayedIds.includes(c.id) && !candidates.some(cand => cand.id === c.id))];
    }
    
    // Pick up to 15
    const selected = candidates.slice(0, 15);

    if (selected.length === 0) {
      return NextResponse.json({ error: "Not enough tracks to build playlist" }, { status: 400 });
    }

    // 5. Persistence
    const playlist = await prisma.playlist.create({
      data: {
        name: `[AI] ${title || "Smart Playlist"}`,
        userId: claims.userId,
        isPublic: false,
      },
    });

    // Bulk insert tracks
    const playlistTracksData = selected.map((t, idx) => ({
      playlistId: playlist.id,
      trackId: t.id,
      position: idx,
    }));

    await prisma.playlistTrack.createMany({
      data: playlistTracksData,
    });

    // Fetch complete object to return
    const completePlaylist = await prisma.playlist.findUnique({
      where: { id: playlist.id },
      include: {
        tracks: {
          include: {
            track: {
              include: { artist: true, album: true },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json(completePlaylist);
  } catch (error) {
    console.error("[ai/smart-playlist]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});

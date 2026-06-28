import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAiEnabled, getAiClient } from "@/lib/ai";
import { withAuth } from "@/lib/middleware";

export const GET = withAuth(async (req, claims) => {
  if (!isAiEnabled()) {
    return NextResponse.json({ error: "AI disabled" }, { status: 403 });
  }

  const ai = getAiClient();
  if (!ai) {
    return NextResponse.json({ error: "AI client error" }, { status: 500 });
  }

  try {
    const prompt = `Propose 4 distinct, engaging concepts for music playlists (e.g., based on different genres, moods, or activities). These should be tailored for a modern music streaming app.
Return a strictly formatted JSON array of exactly 4 objects with this schema:
[
  {
    "title": "A short, catchy playlist title (e.g. 'Late Night Lofi' or 'Workout Pump')",
    "description": "A 1-2 sentence description",
    "searchTerms": ["genre1", "mood1", "keyword"]
  }
]
Do not include any markdown wrapping, just the raw JSON.`;

    const model = process.env.AI_MODEL || "gpt-3.5-turbo";

    const response = await ai.chat.completions.create({
      model,
      messages: [{ role: "system", content: prompt }],
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "[]";
    const cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
    
    let concepts: any[] = [];
    try {
      concepts = JSON.parse(cleaned);
      if (!Array.isArray(concepts)) {
        throw new Error("Not an array");
      }
    } catch (e) {
      console.error("[ai/explore] JSON parse failed", content);
      // Fallback
      concepts = [
        { title: "Chill Vibes", description: "Relaxing tunes for any time.", searchTerms: ["chill", "lofi", "ambient"] },
        { title: "Pop Hits", description: "The biggest pop songs.", searchTerms: ["pop", "hits", "dance"] },
        { title: "Rock Classics", description: "Timeless rock anthems.", searchTerms: ["rock", "classic", "guitar"] },
        { title: "Focus Zone", description: "Music to help you concentrate.", searchTerms: ["focus", "study", "instrumental"] }
      ];
    }

    const playlists = [];

    // For each concept, fetch matching tracks
    for (const concept of concepts.slice(0, 4)) {
      const { title, description, searchTerms = [] } = concept;
      
      const orConditions: any[] = [];
      for (const term of searchTerms) {
        const lowerTerm = term.toLowerCase();
        orConditions.push({ genre: { contains: lowerTerm, mode: 'insensitive' } });
        orConditions.push({ aiTags: { has: lowerTerm } });
      }

      const whereClause = orConditions.length > 0 ? { OR: orConditions } : {};

      let candidates = await prisma.track.findMany({
        where: whereClause,
        take: 30,
        include: { artist: true, album: true }
      });

      // If not enough tracks found by tags/genre, pick randomly
      if (candidates.length < 5) {
        const fallback = await prisma.track.findMany({
          take: 15,
          include: { artist: true, album: true }
        });
        candidates = [...candidates, ...fallback.filter(f => !candidates.some(c => c.id === f.id))];
      }

      // Shuffle candidates slightly
      candidates = candidates.sort(() => Math.random() - 0.5);
      const selected = candidates.slice(0, 15);

      if (selected.length > 0) {
        const tempId = `temp-${crypto.randomUUID()}`;
        
        // Format as a full playlist object that matches the client schema
        const playlistObj = {
          id: tempId,
          name: title,
          description: description,
          userId: claims.userId,
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _isTemp: true, // Flag for the client if needed
          tracks: selected.map((t, idx) => ({
            id: `pt-${crypto.randomUUID()}`,
            playlistId: tempId,
            trackId: t.id,
            position: idx,
            track: t,
          }))
        };
        
        playlists.push(playlistObj);
      }
    }

    return NextResponse.json(playlists);
  } catch (error) {
    console.error("[ai/explore]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});

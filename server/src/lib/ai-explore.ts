import { prisma } from "@/lib/prisma";
import { isAiEnabled, getAiClient } from "@/lib/ai";

export let cachedExplorePlaylists: any[] = [];
export let lastGenerated: Date | null = null;
let isGenerating = false;
export let generationPromise: Promise<void> | null = null;

export async function generateExplorePlaylists() {
  if (isGenerating) return generationPromise;
  if (!isAiEnabled()) {
    console.log("[ai-explore] AI disabled, skipping cron generation.");
    return;
  }

  const ai = getAiClient();
  if (!ai) {
    console.error("[ai-explore] AI client error, skipping cron generation.");
    return;
  }

  try {
    isGenerating = true;
    generationPromise = (async () => {
      console.log("[ai-explore] Starting playlist generation...");
    
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
      console.error("[ai-explore] JSON parse failed", content);
      concepts = [
        { title: "Chill Vibes", description: "Relaxing tunes for any time.", searchTerms: ["chill", "lofi", "ambient"] },
        { title: "Pop Hits", description: "The biggest pop songs.", searchTerms: ["pop", "hits", "dance"] },
        { title: "Rock Classics", description: "Timeless rock anthems.", searchTerms: ["rock", "classic", "guitar"] },
        { title: "Focus Zone", description: "Music to help you concentrate.", searchTerms: ["focus", "study", "instrumental"] }
      ];
    }

    const playlists = [];

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

      if (candidates.length < 5) {
        const fallback = await prisma.track.findMany({
          take: 15,
          include: { artist: true, album: true }
        });
        candidates = [...candidates, ...fallback.filter(f => !candidates.some(c => c.id === f.id))];
      }

      candidates = candidates.sort(() => Math.random() - 0.5);
      const selected = candidates.slice(0, 15);

      if (selected.length > 0) {
        const tempId = `temp-${crypto.randomUUID()}`;
        
        const playlistObj = {
          id: tempId,
          name: title,
          description: description,
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _isTemp: true,
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

      cachedExplorePlaylists = playlists;
      lastGenerated = new Date();
      console.log("[ai-explore] Playlist generation completed. Cache updated.");
    })();
    await generationPromise;
  } catch (error) {
    console.error("[ai-explore] Error generating playlists:", error);
  } finally {
    isGenerating = false;
  }
}

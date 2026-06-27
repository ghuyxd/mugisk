import { prisma } from "@/lib/prisma";
import { ScanStatus, ScanType } from "@prisma/client";
import { getAiClient } from "@/lib/ai";

interface TagJob {
  trackId: string;
  title: string;
  artist: string;
  album: string | undefined;
}

const tagQueue: TagJob[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

const BATCH_SIZE = 30;
const BATCH_TIMEOUT_MS = 30000;

export async function runAutoTagger(trackId: string, title: string, artist: string, album: string | undefined) {
  tagQueue.push({ trackId, title, artist, album });

  if (tagQueue.length >= BATCH_SIZE) {
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
    void flushQueue();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushTimeout = null;
      void flushQueue();
    }, BATCH_TIMEOUT_MS);
  }
}

async function flushQueue() {
  if (tagQueue.length === 0) return;

  const batch = tagQueue.splice(0, BATCH_SIZE);
  
  if (tagQueue.length > 0 && !flushTimeout) {
     flushTimeout = setTimeout(() => {
        flushTimeout = null;
        void flushQueue();
     }, BATCH_TIMEOUT_MS);
  }

  console.log(`[runAutoTagger] Flushing batch of ${batch.length} tracks to AI provider...`);

  const ai = getAiClient();
  if (!ai) {
    console.warn(`[runAutoTagger] AI client not configured. Skipping tag generation for ${batch.length} tracks.`);
    return;
  }

  try {
    const songList = batch.map((job, idx) => `[ID: ${idx}] Title: ${job.title}, Artist: ${job.artist}${job.album ? `, Album: ${job.album}` : ""}`).join("\n");

    const prompt = `You are a music tagging assistant. Categorize each of the following songs into 2 to 4 musical genres or moods.
    
Songs:
${songList}

Return a strictly formatted JSON array of objects, where each object has "id" matching the provided ID, and "tags" containing an array of strings. Example:
[
  { "id": 0, "tags": ["chill", "synthwave"] },
  { "id": 1, "tags": ["upbeat", "pop"] }
]
Do not include any markdown formatting, just the raw JSON array.`;

    const model = process.env.AI_MODEL || "gpt-3.5-turbo";

    const response = await ai.chat.completions.create({
      model,
      messages: [{ role: "system", content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return;

    const cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
    let results: Array<{ id: number, tags: string[] }> = [];
    try {
      results = JSON.parse(cleaned);
    } catch (e) {
      console.error(`[runAutoTagger] Failed to parse JSON batch:\n${content}`);
      return;
    }

    if (!Array.isArray(results)) {
       console.error(`[runAutoTagger] Unexpected JSON format (not an array)`);
       return;
    }

    for (const result of results) {
      const job = batch[result.id];
      if (!job) continue;

      const rawTags = result.tags;
      if (Array.isArray(rawTags) && rawTags.length > 0) {
        const validTags = rawTags.filter((t) => typeof t === "string").slice(0, 4);
        if (validTags.length > 0) {
          try {
            await prisma.track.update({
              where: { id: job.trackId },
              data: { aiTags: validTags },
            });
            console.log(`[runAutoTagger] Updated tags for track ${job.title}: ${validTags.join(", ")}`);
            
            await prisma.scanLog.create({
              data: {
                type: ScanType.WATCH,
                status: ScanStatus.SUCCESS,
                filePath: `AI Tagging: ${job.title}`,
                message: `AI Tagged "${job.title}" with: ${validTags.join(", ")}`,
              },
            });
          } catch (updateErr) {
            console.error(`[runAutoTagger] DB update failed for ${job.trackId}`, updateErr);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[runAutoTagger] Batch flush failed:`, error);
  }
}

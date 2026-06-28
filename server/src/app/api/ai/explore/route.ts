import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware";
import { cachedExplorePlaylists, generationPromise, generateExplorePlaylists } from "@/lib/ai-explore";

export const GET = withAuth(async (req, claims) => {
  try {
    if (cachedExplorePlaylists.length === 0) {
      if (!generationPromise) {
        // Fallback if instrumentation didn't run (e.g. dev server hot reload)
        await generateExplorePlaylists();
      } else {
        await generationPromise;
      }
    }

    // Return cached playlists but inject the current user's ID
    const playlists = cachedExplorePlaylists.map(playlist => ({
      ...playlist,
      userId: claims.userId,
    }));

    return NextResponse.json(playlists);
  } catch (error) {
    console.error("[ai/explore]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});

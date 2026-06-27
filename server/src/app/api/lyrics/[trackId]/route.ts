import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;

    const existingLyrics = await prisma.lyrics.findUnique({
      where: { trackId },
    });

    if (existingLyrics) {
      if (!existingLyrics.plainLyrics && !existingLyrics.syncedLyrics && !existingLyrics.instrumental) {
        // Cached 'not found'
        return NextResponse.json({ success: false, error: "Lyrics not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: existingLyrics });
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        artist: true,
        album: true,
      },
    });

    if (!track) {
      return NextResponse.json({ success: false, error: "Track not found" }, { status: 404 });
    }

    const searchParams = new URLSearchParams({
      track_name: track.title,
      artist_name: track.artist.name,
      duration: Math.round(track.durationSeconds).toString(),
    });

    // if (track.album?.title) {
    //   searchParams.append("album_name", track.album.title);
    // }

    const lrclibUrl = `https://lrclib.net/api/get?${searchParams.toString()}`;
    const response = await fetch(lrclibUrl, {
      headers: {
        "User-Agent": "Mugisk v1.0.0 (https://github.com/mugisk)",
      },
    });

    if (!response.ok) {
      // Create empty record to cache 'not found' state
      await prisma.lyrics.create({
        data: {
          trackId,
          plainLyrics: null,
          syncedLyrics: null,
          instrumental: false,
        },
      });
      return NextResponse.json({ success: false, error: "Lyrics not found" }, { status: 404 });
    }

    const data = await response.json();

    const newLyrics = await prisma.lyrics.create({
      data: {
        trackId,
        plainLyrics: data.plainLyrics || null,
        syncedLyrics: data.syncedLyrics || null,
        instrumental: Boolean(data.instrumental),
      },
    });

    return NextResponse.json({ success: true, data: newLyrics });
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch lyrics" }, { status: 500 });
  }
}

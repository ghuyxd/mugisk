import React, { useEffect, useState } from "react";
import { Play } from "lucide-react";

import { getTracks, getAlbums, type TrackItem, type AlbumItem } from "@renderer/api/library";
import TrackRow from "@renderer/components/TrackRow";
import AlbumCard from "@renderer/components/AlbumCard";
import { usePlayer } from "@renderer/context/PlayerContext";

export default function HomePage(): React.JSX.Element {
  const { playAll } = usePlayer();
  const [recentTracks, setRecentTracks] = useState<TrackItem[]>([]);
  const [recentAlbums, setRecentAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTracks({ sortBy: "createdAt", sortOrder: "desc", limit: 5 }),
      getAlbums({ limit: 10 }),
    ])
      .then(([tracksRes, albumsRes]) => {
        setRecentTracks(tracksRes.data);
        setRecentAlbums(albumsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePlayRecent = () => {
    if (recentTracks.length === 0) return;
    const q = recentTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artistName: t.artist.name,
      albumTitle: t.album?.title ?? "",
      coverUrl: t.album?.coverUrl ?? null,
      durationSeconds: t.durationSeconds,
    }));
    playAll(q, 0);
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Home</h1>
      </div>

      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Recently Added Tracks</h2>
          {recentTracks.length > 0 && (
            <button
              onClick={handlePlayRecent}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--accent)",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 20,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <Play size={16} />
              Play All
            </button>
          )}
        </div>
        
        {recentTracks.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>No recent tracks found.</div>
        ) : (
          <div className="track-list">
            {recentTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i + 1} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Recommended Albums</h2>
        {recentAlbums.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>No albums found.</div>
        ) : (
          <div className="album-grid">
            {recentAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

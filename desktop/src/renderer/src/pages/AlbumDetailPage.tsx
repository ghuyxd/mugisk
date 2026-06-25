import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Disc3, Play } from "lucide-react";

import { getAlbum, type AlbumDetail } from "@renderer/api/library";
import TrackRow from "@renderer/components/TrackRow";
import AddToPlaylistModal from "@renderer/components/AddToPlaylistModal";
import { usePlayer, type QueueTrack } from "@renderer/context/PlayerContext";

export default function AlbumDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { playAll } = usePlayer();
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<QueueTrack | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAlbum(id)
      .then(setAlbum)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="empty-state">
        <Disc3 size={48} />
        <span>Album not found</span>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (album.tracks.length === 0) return;
    const q = album.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artistName: t.artist.name,
      albumTitle: album.title,
      coverUrl: album.coverUrl,
      durationSeconds: t.durationSeconds,
    }));
    playAll(q, 0);
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 32, alignItems: "flex-end", marginBottom: 32 }}>
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: 8,
            overflow: "hidden",
            background: "var(--card-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {album.coverUrl ? (
            <img src={album.coverUrl} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Disc3 size={64} color="var(--text-muted)" />
          )}
        </div>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)" }}>Album</span>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: "8px 0 16px", lineHeight: 1.1 }}>{album.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-muted)" }}>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{album.artist.name}</span>
            {album.year && (
              <>
                <span>•</span>
                <span>{album.year}</span>
              </>
            )}
            <span>•</span>
            <span>{album.tracks.length} track{album.tracks.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={handlePlayAll}
          disabled={album.tracks.length === 0}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: "var(--accent)",
            color: "white",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            opacity: album.tracks.length === 0 ? 0.5 : 1,
          }}
          aria-label="Play album"
        >
          <Play size={24} style={{ marginLeft: 4 }} />
        </button>
      </div>

      {/* Tracks */}
      <div className="track-list">
        {album.tracks.map((track) => (
          <TrackRow
            key={track.id}
            track={{ ...track, album }}
            index={track.trackNumber || undefined}
            onAddToPlaylist={setAddToPlaylistTrack}
          />
        ))}
      </div>

      {addToPlaylistTrack && (
        <AddToPlaylistModal
          track={addToPlaylistTrack}
          onClose={() => setAddToPlaylistTrack(null)}
        />
      )}
    </div>
  );
}

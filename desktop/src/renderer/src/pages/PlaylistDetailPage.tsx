import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ListMusic, Play } from "lucide-react";

import { getPlaylist, removeTrackFromPlaylist, type PlaylistDetail } from "@renderer/api/library";
import TrackRow from "@renderer/components/TrackRow";
import { usePlayer } from "@renderer/context/PlayerContext";

export default function PlaylistDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { playAll } = usePlayer();

  useEffect(() => {
    if (!id) return;
    loadPlaylist(id);
  }, [id]);

  const loadPlaylist = (playlistId: string) => {
    setLoading(true);
    getPlaylist(playlistId)
      .then(setPlaylist)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="empty-state">
        <ListMusic size={48} />
        <span>Playlist not found</span>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (playlist.tracks.length === 0) return;
    const q = playlist.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artistName: t.artist.name,
      albumTitle: t.album.title,
      coverUrl: t.album.coverUrl,
      durationSeconds: t.durationSeconds,
    }));
    playAll(q, 0);
  };

  const handleRemoveTrack = (trackId: string) => {
    if (!playlist) return;
    removeTrackFromPlaylist(playlist.id, trackId)
      .then(() => {
        setPlaylist((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tracks: prev.tracks.filter((t) => t.id !== trackId),
          };
        });
      })
      .catch(console.error);
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
          <ListMusic size={64} color="var(--text-muted)" />
        </div>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)" }}>Playlist</span>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: "8px 0 16px", lineHeight: 1.1 }}>{playlist.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-muted)" }}>
            <span>{playlist.tracks.length} track{playlist.tracks.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={handlePlayAll}
          disabled={playlist.tracks.length === 0}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: "var(--brand)",
            color: "white",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            opacity: playlist.tracks.length === 0 ? 0.5 : 1,
          }}
          aria-label="Play playlist"
        >
          <Play size={24} style={{ marginLeft: 4 }} />
        </button>
      </div>

      {/* Tracks */}
      {playlist.tracks.length === 0 ? (
        <div className="empty-state">
          <span>This playlist is empty. Search for songs to add them!</span>
        </div>
      ) : (
        <div className="track-list">
          {playlist.tracks.map((track, i) => (
            <TrackRow
              key={`${track.id}-${i}`}
              track={track}
              index={i + 1}
              playlistId={playlist.id}
              onRemoveFromPlaylist={handleRemoveTrack}
            />
          ))}
        </div>
      )}
    </div>
  );
}

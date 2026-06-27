import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Album, Track } from "@mugisk/shared-types";
import { getAlbum, getAlbumTracks } from "../api/library";
import { getServerUrlSync } from "../api/axios";
import { usePlayer } from "../context/PlayerContext";
import { useFavorites } from "../context/FavoritesContext";
import { ArrowLeft, Play, MoreHorizontal, Disc3 } from "lucide-react";

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AlbumDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const player = usePlayer();
  const { toggleFavorite } = useFavorites();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getAlbum(id), getAlbumTracks(id)])
      .then(([a, t]) => {
        setAlbum(a);
        setTracks(t);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      player.playTrack(tracks[0], tracks, 0);
    }
  };

  const handlePlayTrack = (track: Track, index: number) => {
    player.playTrack(track, tracks, index);
  };

  const handleContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-track-menu", {
      detail: { track, x: e.clientX, y: e.clientY }
    }));
  };

  if (loading) return <div style={{ padding: 24, color: "var(--text-muted)" }}>Loading album...</div>;
  if (!album) return <div style={{ padding: 24 }}>Album not found.</div>;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      <button 
        style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", marginBottom: 24 }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: "flex", gap: 32, marginBottom: 32 }}>
        <div style={{ width: 200, height: 200, backgroundColor: "var(--bg-lighter)", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {album.coverArtId ? (
            <img 
              src={`${getServerUrlSync()}${album.coverArtId}`} 
              alt={album.title} 
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <Disc3 size={64} color="var(--text-muted)" />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600, letterSpacing: 1, color: "var(--text-muted)", marginBottom: 8 }}>Album</div>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: "0 0 8px 0" }}>{album.title}</h1>
          <div style={{ fontSize: 16, color: "var(--text-muted)", marginBottom: 16 }}>
            {album.artist} • {album.year || "Unknown Year"} • {album.trackCount} tracks
          </div>
          <div>
            <button className="primary-btn" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={handlePlayAll}>
              <Play size={16} fill="currentColor" /> Play All
            </button>
          </div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
            <th style={{ padding: "8px 12px", width: 40 }}>#</th>
            <th style={{ padding: "8px 12px" }}>Title</th>
            <th style={{ padding: "8px 12px", width: 80, textAlign: "right" }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, i) => {
            const isPlaying = player.currentTrack?.id === track.id;
            return (
              <tr 
                key={track.id} 
                className={`track-row ${isPlaying ? "playing" : ""}`}
                style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", color: isPlaying ? "var(--primary)" : "inherit" }}
                onDoubleClick={() => handlePlayTrack(track, i)}
                onContextMenu={(e) => handleContextMenu(e, track)}
              >
                <td style={{ padding: "12px" }}>
                  <div className="track-row-index">
                    {isPlaying ? <Play size={14} fill="currentColor" /> : track.trackNumber || i + 1}
                  </div>
                  <button 
                    className="track-row-play-btn"
                    onClick={() => handlePlayTrack(track, i)}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "none" }}
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                </td>
                <td style={{ padding: "12px", fontWeight: 500 }}>{track.title}</td>
                <td style={{ padding: "12px", color: "var(--text-muted)", textAlign: "right" }}>
                  <span className="track-row-time">{formatDuration(track.duration)}</span>
                  <button 
                    className="track-row-menu-btn"
                    onClick={(e) => handleContextMenu(e, track)}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "none" }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import React from "react";
import { useFavorites } from "../context/FavoritesContext";
import { usePlayer } from "../context/PlayerContext";
import { Play, Shuffle, Heart } from "lucide-react";
import type { Track } from "@mugisk/shared-types";

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function FavoritesPage(): React.JSX.Element {
  const { favorites, loading, toggleFavorite } = useFavorites();
  const player = usePlayer();

  const handlePlayAll = () => {
    if (favorites.length > 0) {
      player.playTrack(favorites[0], favorites, 0);
    }
  };

  const handleShuffle = () => {
    if (favorites.length > 0) {
      // Just play all and toggle shuffle on
      player.playTrack(favorites[Math.floor(Math.random() * favorites.length)], favorites);
      if (!player.shuffle) {
        player.toggleShuffle();
      }
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: "var(--text-muted)" }}>Loading favorites...</div>;
  }

  return (
    <div className="page-container" style={{ padding: 32 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 32 }}>
        <div 
          style={{ 
            width: 180, 
            height: 180, 
            background: "linear-gradient(135deg, #FF6B6B 0%, #C92A2A 100%)", 
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
          }}
        >
          <Heart size={64} color="white" fill="white" />
        </div>
        <div>
          <h4 style={{ margin: 0, textTransform: "uppercase", fontSize: 12, letterSpacing: 1, color: "var(--text-muted)" }}>Playlist</h4>
          <h1 style={{ margin: "8px 0", fontSize: 48, fontWeight: 900, letterSpacing: -1 }}>Liked Songs</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
            {favorites.length} {favorites.length === 1 ? 'song' : 'songs'}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <button 
          onClick={handlePlayAll}
          disabled={favorites.length === 0}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 32px", borderRadius: 32,
            background: "var(--primary)", color: "white",
            border: "none", fontWeight: "bold", fontSize: 14,
            cursor: favorites.length > 0 ? "pointer" : "not-allowed",
            opacity: favorites.length > 0 ? 1 : 0.5
          }}
        >
          <Play size={18} fill="currentColor" /> Play
        </button>
        <button 
          onClick={handleShuffle}
          disabled={favorites.length === 0}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 24px", borderRadius: 32,
            background: "var(--bg-lighter)", color: "var(--text)",
            border: "1px solid var(--border)", fontWeight: "bold", fontSize: 14,
            cursor: favorites.length > 0 ? "pointer" : "not-allowed",
            opacity: favorites.length > 0 ? 1 : 0.5
          }}
        >
          <Shuffle size={18} /> Shuffle
        </button>
      </div>

      {favorites.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
              <th style={{ padding: "12px 8px", width: 40 }}>#</th>
              <th style={{ padding: "12px 8px" }}>Title</th>
              <th style={{ padding: "12px 8px" }}>Album</th>
              <th style={{ padding: "12px 8px" }}>Date Added</th>
              <th style={{ padding: "12px 8px", textAlign: "right" }}>Time</th>
              <th style={{ padding: "12px 8px", width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {favorites.map((track, i) => {
              const isPlaying = player.currentTrack?.id === track.id;
              return (
                <tr 
                  key={track.id} 
                  className={`track-row ${isPlaying ? "playing" : ""}`}
                  onDoubleClick={() => player.playTrack(track, favorites, i)}
                  style={{ 
                    borderBottom: "1px solid var(--border)",
                    color: isPlaying ? "var(--primary)" : "inherit"
                  }}
                >
                  <td style={{ padding: "12px 8px" }}>
                    <div className="track-row-index">
                      {isPlaying ? <Play size={12} fill="currentColor" /> : i + 1}
                    </div>
                    <button 
                      className="track-row-play-btn"
                      onClick={() => player.playTrack(track, favorites, i)}
                      style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "none" }}
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{track.title}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{track.artist}</div>
                  </td>
                  <td style={{ padding: "12px 8px", color: "var(--text-muted)", fontSize: 13 }}>{track.album}</td>
                  <td style={{ padding: "12px 8px", color: "var(--text-muted)", fontSize: 13 }}>
                    {new Date(track.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "12px 8px", color: "var(--text-muted)", fontSize: 13, textAlign: "right" }}>
                    {formatDuration(track.duration)}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(track.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)" }}
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div style={{ textAlign: "center", padding: 64, color: "var(--text-muted)" }}>
          <Heart size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h3>Songs you like will appear here</h3>
          <p>Save songs by tapping the heart icon.</p>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState, useRef } from "react";
import type { Track } from "@mugisk/shared-types";
import { getTracks } from "../../api/library";
import { usePlayer } from "../../context/PlayerContext";
import { useFavorites } from "../../context/FavoritesContext";
import { Play, Plus, MoreHorizontal } from "lucide-react";

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SongsView(): React.JSX.Element {
  const player = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);

  // Parse genre from search if needed (simple way to support genre filter if navigated from GenresView)
  const queryParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const genre = queryParams.get("genre") || undefined;

  const fetchTracks = async (p: number) => {
    try {
      setLoading(true);
      const res = await getTracks(p, 100, undefined, genre);
      if (p === 1) {
        setTracks(res.items);
      } else {
        setTracks(prev => [...prev, ...res.items]);
      }
      setHasNext(res.hasNextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks(1);
  }, [genre]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTracks(nextPage);
  };

  const { toggleFavorite } = useFavorites();

  const handlePlay = (track: Track, index: number) => {
    // If we have a massive list, passing the whole list might be heavy, but 100-500 is fine.
    player.playTrack(track, tracks, index);
  };

  const handleContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-track-menu", {
      detail: { track, x: e.clientX, y: e.clientY }
    }));
  };

  return (
    <div style={{ padding: "0 24px 24px" }}>
      {genre && <h2 style={{ marginBottom: 16 }}>Genre: {genre}</h2>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
            <th style={{ padding: "8px 12px", width: 40 }}>#</th>
            <th style={{ padding: "8px 12px" }}>Title</th>
            <th style={{ padding: "8px 12px" }}>Artist</th>
            <th style={{ padding: "8px 12px" }}>Album</th>
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
                style={{ 
                  borderBottom: "1px solid var(--border)", 
                  cursor: "pointer",
                  color: isPlaying ? "var(--primary)" : "inherit"
                }}
                onDoubleClick={() => handlePlay(track, i)}
                onContextMenu={(e) => handleContextMenu(e, track)}
              >
                <td style={{ padding: "12px" }}>
                  <div className="track-row-index">
                    {isPlaying ? <Play size={14} fill="currentColor" /> : i + 1}
                  </div>
                  <button 
                    className="track-row-play-btn"
                    onClick={() => handlePlay(track, i)}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "none" }}
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                </td>
                <td style={{ padding: "12px", fontWeight: 500 }}>{track.title}</td>
                <td style={{ padding: "12px", color: "var(--text-muted)" }}>{track.artist}</td>
                <td style={{ padding: "12px", color: "var(--text-muted)" }}>{track.album}</td>
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
      
      {loading && <div style={{ marginTop: 24, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>}
      
      {hasNext && !loading && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button className="primary-btn" onClick={handleLoadMore}>
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

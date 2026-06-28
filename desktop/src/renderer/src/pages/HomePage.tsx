import React, { useEffect, useState } from "react";
import { getTracks } from "../api/library";
import { getServerUrlSync } from "../api/axios";
import type { Track } from "@mugisk/shared-types";
import { Disc3, Play } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

export default function HomePage(): React.JSX.Element {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const player = usePlayer();

  useEffect(() => {
    getTracks(1, 20, undefined, undefined, "createdAt", "desc")
      .then((res) => {
        setTracks(res.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePlayTrack = (track: Track, index: number) => {
    player.playTrack(track, tracks, index);
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "24px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24, marginTop: 0 }}>Home</h1>
      
      <section>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          Recently Added
        </h2>
        
        {loading ? (
          <div style={{ color: "var(--text-muted)" }}>Loading recent tracks...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 24 }}>
            {tracks.map((track, idx) => (
              <div 
                key={track.id} 
                className="album-card" 
                style={{ cursor: "pointer", position: "relative" }}
                onClick={() => handlePlayTrack(track, idx)}
              >
                <div style={{ 
                  width: "100%", 
                  aspectRatio: "1/1", 
                  backgroundColor: "var(--bg-lighter)", 
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginBottom: 12,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  position: "relative"
                }} className="card-image-container">
                  {track.coverArtId ? (
                    <img 
                      src={`${getServerUrlSync()}${track.coverArtId}`} 
                      alt={track.title} 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <Disc3 size={48} color="var(--text-muted)" />
                  )}
                  <div className="card-play-overlay">
                    <Play size={24} fill="currentColor" />
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                  {track.title}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {track.artist}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import React, { useEffect, useState, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import { X, Mic2, AlertCircle } from "lucide-react";
import apiClient from "../api/axios";
import type { Lyrics } from "@mugisk/shared-types";

function parseSyncedLyrics(syncedLyrics: string) {
  const lines = syncedLyrics.split('\n');
  const parsed: { time: number, text: string }[] = [];
  const regex = /\[(\d{2}):(\d{2}\.\d{2,3})\](.*)/;
  
  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = match[3].trim();
      if (text) {
        parsed.push({ time, text });
      }
    }
  }
  return parsed;
}

export default function LyricsPanel({ onClose }: { onClose: () => void }): React.JSX.Element {
  const player = usePlayer();
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncedLines, setSyncedLines] = useState<{time: number, text: string}[]>([]);
  
  const currentTrackId = player.currentTrack?.id;
  const currentTime = player.progress * (player.currentTrack?.duration || 0);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentTrackId) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    setLyrics(null);
    setSyncedLines([]);

    apiClient.get(`/api/lyrics/${currentTrackId}`)
      .then(res => {
        if (!mounted) return;
        const data = res.data.data;
        setLyrics(data);
        if (data.syncedLyrics) {
          setSyncedLines(parseSyncedLyrics(data.syncedLyrics));
        }
      })
      .catch(err => {
        if (!mounted) return;
        if (err.response?.status === 404) {
          setError("Lyrics not found for this track.");
        } else {
          setError("Failed to fetch lyrics.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [currentTrackId]);

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentTime, syncedLines]);

  let activeIndex = -1;
  if (syncedLines.length > 0) {
    for (let i = 0; i < syncedLines.length; i++) {
      if (currentTime >= syncedLines[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  return (
    <div style={{
      position: "fixed",
      top: 32,
      bottom: 80,
      right: 0,
      width: 400,
      backgroundColor: "var(--bg-lighter)",
      borderLeft: "1px solid var(--border)",
      boxShadow: "-4px 0 16px rgba(0,0,0,0.2)",
      zIndex: 100,
      display: "flex",
      flexDirection: "column",
      transform: "translateX(0)",
      transition: "transform 0.3s ease"
    }}>
      <div style={{ padding: 16, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 16, margin: 0, fontWeight: "bold", display: "flex", alignItems: "center", gap: 8 }}>
          <Mic2 size={18} /> Lyrics
        </h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer" }}>
          <X size={20} />
        </button>
      </div>
      
      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", padding: 24, fontSize: 16, lineHeight: 1.8, scrollBehavior: 'smooth' }}>
        {!player.currentTrack && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40 }}>
            Play a track to see lyrics
          </div>
        )}
        
        {player.currentTrack && loading && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40 }}>
            Loading lyrics...
          </div>
        )}

        {player.currentTrack && !loading && error && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <AlertCircle size={32} opacity={0.5} />
            {error}
          </div>
        )}

        {player.currentTrack && !loading && lyrics && (
          <>
            {lyrics.instrumental && (
              <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40, fontStyle: "italic" }}>
                This track is instrumental.
              </div>
            )}
            
            {!lyrics.instrumental && syncedLines.length > 0 && (
              <div style={{ paddingBottom: '50vh' }}>
                {syncedLines.map((line, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <div 
                      key={i} 
                      ref={isActive ? activeLineRef : null}
                      style={{
                        transition: "all 0.3s ease",
                        color: isActive ? "var(--primary)" : "var(--text)",
                        opacity: isActive ? 1 : 0.5,
                        fontWeight: isActive ? "bold" : "normal",
                        transform: isActive ? "scale(1.05)" : "scale(1)",
                        transformOrigin: "left center",
                        marginBottom: 16
                      }}
                    >
                      {line.text}
                    </div>
                  );
                })}
              </div>
            )}

            {!lyrics.instrumental && syncedLines.length === 0 && lyrics.plainLyrics && (
              <div style={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>
                {lyrics.plainLyrics}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

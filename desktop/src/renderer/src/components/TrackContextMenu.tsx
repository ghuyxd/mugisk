import React, { useEffect, useState, useRef } from "react";
import type { Track, Playlist } from "@mugisk/shared-types";
import { usePlayer } from "../context/PlayerContext";
import { getPlaylists, addTrackToPlaylist } from "../api/library";
import { Play, ListPlus, Music, Plus } from "lucide-react";

export default function TrackContextMenu(): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const player = usePlayer();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ track: Track; x: number; y: number }>;
      setTrack(customEvent.detail.track);
      setPos({ x: customEvent.detail.x, y: customEvent.detail.y });
      setOpen(true);
      setShowPlaylists(false);
    };

    window.addEventListener("open-track-menu", handleOpen);
    return () => window.removeEventListener("open-track-menu", handleOpen);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (showPlaylists && playlists.length === 0) {
      getPlaylists(1, 100).then(res => setPlaylists(res.items)).catch(console.error);
    }
  }, [showPlaylists]);

  if (!open || !track) return null;

  const handlePlayNext = () => {
    // Insert after current queue index
    const newQueue = [...player.queue];
    newQueue.splice(player.queueIndex + 1, 0, track);
    player.reorderQueue(newQueue, player.queueIndex);
    setOpen(false);
  };

  const handleAddToQueue = () => {
    player.addToQueue(track);
    setOpen(false);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      await addTrackToPlaylist(playlistId, track.id);
      // could show a toast here
    } catch (err) {
      console.error(err);
    }
    setOpen(false);
  };

  // Adjust position to avoid overflow
  let x = pos.x;
  let y = pos.y;
  if (x + 200 > window.innerWidth) x = window.innerWidth - 200;
  if (y + 150 > window.innerHeight) y = window.innerHeight - 150;

  return (
    <div 
      ref={menuRef}
      style={{
        position: "fixed",
        top: y,
        left: x,
        width: 200,
        backgroundColor: "var(--bg-lighter)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        zIndex: 1000,
        padding: "4px 0",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {!showPlaylists ? (
        <>
          <button className="context-menu-item" onClick={handlePlayNext}>
            <Play size={14} /> Play Next
          </button>
          <button className="context-menu-item" onClick={handleAddToQueue}>
            <ListPlus size={14} /> Add to Queue
          </button>
          <div style={{ height: 1, backgroundColor: "var(--border)", margin: "4px 0" }} />
          <button className="context-menu-item" onClick={() => setShowPlaylists(true)}>
            <Plus size={14} /> Add to Playlist...
          </button>
        </>
      ) : (
        <>
          <div style={{ padding: "4px 12px", fontSize: 12, color: "var(--text-muted)", fontWeight: "bold" }}>
            Select Playlist
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {playlists.map(p => (
              <button key={p.id} className="context-menu-item" onClick={() => handleAddToPlaylist(p.id)}>
                <Music size={14} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              </button>
            ))}
            {playlists.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-muted)" }}>Loading...</div>}
          </div>
        </>
      )}
    </div>
  );
}

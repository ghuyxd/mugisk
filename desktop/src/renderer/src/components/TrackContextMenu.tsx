import React, { useEffect, useState, useRef } from "react";
import type { Track, Playlist } from "@mugisk/shared-types";
import { usePlayer } from "../context/PlayerContext";
import { useFavorites } from "../context/FavoritesContext";
import { getPlaylists, addTrackToPlaylist, createPlaylist } from "../api/library";
import { Play, ListPlus, Music, Plus, Heart, FolderPlus } from "lucide-react";

export default function TrackContextMenu(): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const player = usePlayer();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ track: Track; x: number; y: number }>;
      setTrack(customEvent.detail.track);
      setPos({ x: customEvent.detail.x, y: customEvent.detail.y });
      setOpen(true);
      setShowPlaylists(false);
      setIsCreatingPlaylist(false);
      setNewPlaylistName("");
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

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const newPlaylist = await createPlaylist(newPlaylistName.trim());
      await addTrackToPlaylist(newPlaylist.id, track.id);
      setPlaylists(prev => [newPlaylist, ...prev]);
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
          <button 
            className="context-menu-item" 
            onClick={() => { toggleFavorite(track.id); setOpen(false); }}
            style={{ color: favoriteIds.has(track.id) ? "var(--primary)" : "inherit" }}
          >
            <Heart size={14} fill={favoriteIds.has(track.id) ? "currentColor" : "none"} /> 
            {favoriteIds.has(track.id) ? "Unfavorite" : "Favorite"}
          </button>
          <button className="context-menu-item" onClick={() => setShowPlaylists(true)}>
            <Plus size={14} /> Add to Playlist...
          </button>
        </>
      ) : isCreatingPlaylist ? (
        <>
          <div style={{ padding: "4px 12px", fontSize: 12, color: "var(--text-muted)", fontWeight: "bold" }}>
            New Playlist
          </div>
          <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <input 
              autoFocus
              type="text" 
              placeholder="Playlist Name" 
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreatePlaylist();
                if (e.key === 'Escape') setIsCreatingPlaylist(false);
              }}
              style={{
                width: "100%", padding: "4px 8px", borderRadius: 4, 
                border: "1px solid var(--border)", background: "var(--bg)", 
                color: "var(--text)", outline: "none"
              }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              <button className="primary-btn" style={{ flex: 1, padding: "4px 0", fontSize: 12 }} onClick={handleCreatePlaylist}>Create</button>
              <button style={{ flex: 1, padding: "4px 0", fontSize: 12, background: "none", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 4, cursor: "pointer" }} onClick={() => setIsCreatingPlaylist(false)}>Cancel</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ padding: "4px 12px", fontSize: 12, color: "var(--text-muted)", fontWeight: "bold" }}>
            Select Playlist
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            <button className="context-menu-item" onClick={() => setIsCreatingPlaylist(true)}>
              <FolderPlus size={14} /> <span style={{ fontWeight: 500 }}>New Playlist...</span>
            </button>
            <div style={{ height: 1, backgroundColor: "var(--border)", margin: "4px 0" }} />
            {playlists.map(p => (
              <button key={p.id} className="context-menu-item" onClick={() => handleAddToPlaylist(p.id)}>
                <Music size={14} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              </button>
            ))}
            {playlists.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-muted)" }}>No playlists found.</div>}
          </div>
        </>
      )}
    </div>
  );
}

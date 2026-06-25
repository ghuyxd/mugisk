import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Playlist, Track } from "@mugisk/shared-types";
import { getPlaylist, getPlaylistTracks, removeTrackFromPlaylist, reorderPlaylistTracks, updatePlaylist } from "../api/library";
import { usePlayer } from "../context/PlayerContext";
import { ArrowLeft, Play, MoreHorizontal, Trash2, GripVertical, Pencil } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SortableTrackRowProps {
  track: Track;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function SortableTrackRow({ track, index, isPlaying, onPlay, onRemove, onContextMenu }: SortableTrackRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderBottom: "1px solid var(--border)", 
    color: isPlaying ? "var(--primary)" : "inherit",
    backgroundColor: "var(--bg)"
  };

  return (
    <tr 
      ref={setNodeRef} 
      style={style}
      className={`track-row ${isPlaying ? "playing" : ""}`}
      onDoubleClick={onPlay}
      onContextMenu={onContextMenu}
    >
      <td style={{ padding: "12px", width: 40, cursor: "grab" }} {...attributes} {...listeners}>
        <GripVertical size={16} color="var(--text-muted)" />
      </td>
      <td style={{ padding: "12px", width: 40 }}>
        <div className="track-row-index">
          {isPlaying ? <Play size={14} fill="currentColor" /> : index + 1}
        </div>
        <button 
          className="track-row-play-btn"
          onClick={onPlay}
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "none" }}
        >
          <Play size={14} fill="currentColor" />
        </button>
      </td>
      <td style={{ padding: "12px", fontWeight: 500 }}>{track.title}</td>
      <td style={{ padding: "12px", color: "var(--text-muted)" }}>{track.artist}</td>
      <td style={{ padding: "12px", color: "var(--text-muted)", textAlign: "right" }}>
        <span className="track-row-time">{formatDuration(track.duration)}</span>
        <button 
          className="track-row-menu-btn"
          onClick={onRemove}
          style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "none", marginLeft: 16 }}
          title="Remove from playlist"
        >
          <Trash2 size={16} />
        </button>
        <button 
          className="track-row-menu-btn"
          onClick={onContextMenu}
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "none", marginLeft: 8 }}
        >
          <MoreHorizontal size={16} />
        </button>
      </td>
    </tr>
  );
}

export default function PlaylistDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const player = usePlayer();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getPlaylist(id), getPlaylistTracks(id)])
      .then(([p, t]) => {
        setPlaylist(p);
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = tracks.findIndex((t) => t.id === active.id);
      const newIndex = tracks.findIndex((t) => t.id === over?.id);
      const newTracks = arrayMove(tracks, oldIndex, newIndex);
      setTracks(newTracks);
      
      // Persist to server
      if (id) {
        try {
          await reorderPlaylistTracks(id, newTracks.map(t => t.id));
        } catch (err) {
          console.error(err);
          // Revert on error if desired, but we assume success for simplicity here
        }
      }
    }
  };

  const handleRemoveTrack = async (track: Track) => {
    if (!id) return;
    try {
      await removeTrackFromPlaylist(id, track.id);
      setTracks(prev => prev.filter(t => t.id !== track.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-track-menu", {
      detail: { track, x: e.clientX, y: e.clientY }
    }));
  };

  const handleRename = async () => {
    if (!playlist) return;
    const newName = prompt("Enter new name for playlist:", playlist.name);
    if (newName && newName !== playlist.name) {
      try {
        const updated = await updatePlaylist(playlist.id, { name: newName });
        setPlaylist(updated);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) return <div style={{ padding: 24, color: "var(--text-muted)" }}>Loading playlist...</div>;
  if (!playlist) return <div style={{ padding: 24 }}>Playlist not found.</div>;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      <button 
        style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", marginBottom: 24 }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600, letterSpacing: 1, color: "var(--text-muted)" }}>Playlist</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: 0 }}>{playlist.name}</h1>
          <button onClick={handleRename} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <Pencil size={20} />
          </button>
        </div>
        <div style={{ fontSize: 16, color: "var(--text-muted)" }}>
          {tracks.length} tracks
        </div>
        <div>
          <button className="primary-btn" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={handlePlayAll}>
            <Play size={16} fill="currentColor" /> Play Playlist
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
              <th style={{ padding: "8px 12px", width: 40 }}></th>
              <th style={{ padding: "8px 12px", width: 40 }}>#</th>
              <th style={{ padding: "8px 12px" }}>Title</th>
              <th style={{ padding: "8px 12px" }}>Artist</th>
              <th style={{ padding: "8px 12px", width: 120, textAlign: "right" }}>Time</th>
            </tr>
          </thead>
          <tbody>
            <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tracks.map((track, i) => (
                <SortableTrackRow 
                  key={track.id} 
                  track={track} 
                  index={i} 
                  isPlaying={player.currentTrack?.id === track.id}
                  onPlay={() => player.playTrack(track, tracks, i)}
                  onRemove={() => handleRemoveTrack(track)}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </DndContext>
      {tracks.length === 0 && <div style={{ marginTop: 24, textAlign: "center", color: "var(--text-muted)" }}>No tracks in this playlist yet. Add some from the library!</div>}
    </div>
  );
}

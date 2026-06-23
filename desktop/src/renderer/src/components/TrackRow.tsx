/**
 * TrackRow — reusable track row for Songs, Album detail, Playlist detail, etc.
 *
 * Features:
 * - Hover to show play button
 * - Duration display
 * - Context menu: Add to queue / Add to playlist / Remove from playlist
 */

import React, { useCallback, useRef, useState } from "react";
import { ListPlus, MoreHorizontal, Play, Trash2 } from "lucide-react";

import type { TrackItem, PlaylistTrack } from "@renderer/api/library";
import type { QueueTrack } from "@renderer/context/PlayerContext";
import { usePlayer } from "@renderer/context/PlayerContext";

// Accept either a full TrackItem or a PlaylistTrack (both have the needed fields)
type AnyTrack = TrackItem | PlaylistTrack;

interface Props {
  track: AnyTrack;
  index?: number; // row number displayed (1-based)
  playlistId?: string; // if set, shows "remove from playlist"
  onRemoveFromPlaylist?: (trackId: string) => void;
  onAddToPlaylist?: (track: QueueTrack) => void;
  isActive?: boolean;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function toQueueTrack(t: AnyTrack): QueueTrack {
  return {
    id: t.id,
    title: t.title,
    artistName: t.artist.name,
    albumTitle: "album" in t ? (t.album?.title ?? "") : "",
    coverUrl: "album" in t ? (t.album?.coverUrl ?? null) : null,
    durationSeconds: t.durationSeconds,
  };
}

export default function TrackRow({
  track,
  index,
  playlistId,
  onRemoveFromPlaylist,
  onAddToPlaylist,
  isActive = false,
}: Props): React.JSX.Element {
  const { playTrack, addToQueue, currentIndex, queue } = usePlayer();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const qt = toQueueTrack(track);
  const isCurrentlyPlaying =
    isActive || (queue[currentIndex]?.id === track.id);

  const handlePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playTrack(qt);
    },
    [qt, playTrack],
  );

  const handleAddToQueue = useCallback(() => {
    addToQueue(qt);
    setMenuOpen(false);
  }, [qt, addToQueue]);

  const handleAddToPlaylist = useCallback(() => {
    onAddToPlaylist?.(qt);
    setMenuOpen(false);
  }, [qt, onAddToPlaylist]);

  const handleRemove = useCallback(() => {
    onRemoveFromPlaylist?.(track.id);
    setMenuOpen(false);
  }, [track.id, onRemoveFromPlaylist]);

  // Close menu on outside click
  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className={`track-row${isCurrentlyPlaying ? " track-row--active" : ""}`}
      onDoubleClick={handlePlay}
    >
      {/* Track number / play indicator */}
      <div className="track-row-num">
        <span className="track-row-index">{index ?? ""}</span>
        <button
          className="track-row-play"
          onClick={handlePlay}
          aria-label={`Play ${track.title}`}
        >
          <Play size={13} />
        </button>
      </div>

      {/* Title + artist */}
      <div className="track-row-main">
        <span className="track-row-title">{track.title}</span>
        <span className="track-row-artist">{track.artist.name}</span>
      </div>

      {/* Album (only for full TrackItem) */}
      {"album" in track && track.album ? (
        <span className="track-row-album">{track.album.title}</span>
      ) : (
        <span />
      )}

      {/* Duration */}
      <span className="track-row-duration">
        {formatDuration(track.durationSeconds)}
      </span>

      {/* Context menu */}
      <div className="track-row-menu-wrap" ref={menuRef}>
        <button
          className="track-row-menu-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Track options"
        >
          <MoreHorizontal size={15} />
        </button>
        {menuOpen && (
          <div className="context-menu">
            <button className="context-menu-item" onClick={handleAddToQueue}>
              <ListPlus size={13} />
              Add to queue
            </button>
            {onAddToPlaylist && (
              <button
                className="context-menu-item"
                onClick={handleAddToPlaylist}
              >
                <ListPlus size={13} />
                Add to playlist…
              </button>
            )}
            {playlistId && onRemoveFromPlaylist && (
              <>
                <div className="context-menu-divider" />
                <button
                  className="context-menu-item danger"
                  onClick={handleRemove}
                >
                  <Trash2 size={13} />
                  Remove from playlist
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AddToPlaylistModal — small picker overlay for adding a track to a playlist.
 * Shown when the user clicks "Add to playlist…" from a TrackRow context menu.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ListMusic, Loader, Plus, X } from "lucide-react";

import {
  addTrackToPlaylist,
  createPlaylist,
  getPlaylists,
  type PlaylistItem,
} from "@renderer/api/library";
import type { QueueTrack } from "@renderer/context/PlayerContext";

interface Props {
  track: QueueTrack;
  onClose: () => void;
}

export default function AddToPlaylistModal({
  track,
  onClose,
}: Props): React.JSX.Element {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    getPlaylists()
      .then((res) => setPlaylists(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (overlayRef.current === e.target) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAdd = useCallback(
    async (playlistId: string) => {
      setAdding(playlistId);
      try {
        await addTrackToPlaylist(playlistId, track.id);
        setAdded(playlistId);
        setTimeout(onClose, 700);
      } catch {
        /* ignore 409 duplicates */
        setAdded(playlistId);
        setTimeout(onClose, 700);
      } finally {
        setAdding(null);
      }
    },
    [track.id, onClose],
  );

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { createPlaylist: create } = await import("@renderer/api/library");
      void create; // already imported below
      const pl = await createPlaylist(newName.trim());
      await addTrackToPlaylist(pl.id, track.id);
      onClose();
    } catch {
      setCreating(false);
    }
  }, [newName, track.id, onClose]);

  return (
    <div className="modal-overlay" ref={overlayRef}>
      <div className="modal" role="dialog" aria-label="Add to playlist">
        <div className="modal-header">
          <div className="modal-title">
            <ListMusic size={15} />
            Add to playlist
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="modal-track-name">{track.title}</div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">
              <Loader size={18} className="spin" />
            </div>
          ) : (
            <div className="modal-list">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  className={`modal-playlist-item${added === pl.id ? " added" : ""}`}
                  onClick={() => void handleAdd(pl.id)}
                  disabled={adding !== null || added !== null}
                >
                  <ListMusic size={13} />
                  <span className="modal-playlist-name">{pl.name}</span>
                  <span className="modal-playlist-count">
                    {pl._count.tracks}
                  </span>
                  {added === pl.id ? (
                    <Check size={13} className="modal-playlist-check" />
                  ) : adding === pl.id ? (
                    <Loader size={13} className="spin" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create new playlist */}
        <div className="modal-footer">
          <div className="modal-create-row">
            <input
              className="modal-create-input"
              placeholder="New playlist…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              autoFocus
            />
            <button
              className="modal-create-btn"
              onClick={() => void handleCreate()}
              disabled={!newName.trim() || creating}
              aria-label="Create playlist and add"
            >
              {creating ? <Loader size={13} className="spin" /> : <Plus size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

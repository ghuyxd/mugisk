import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Playlist } from "@mugisk/shared-types";
import { getPlaylists, createPlaylist, deletePlaylist } from "../api/library";
import { ListMusic, Plus, Trash2 } from "lucide-react";

export default function PlaylistsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const res = await getPlaylists(1, 100);
      setPlaylists(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleCreate = async () => {
    const name = prompt("Enter playlist name:");
    if (!name) return;
    try {
      await createPlaylist(name);
      fetchPlaylists();
    } catch (err) {
      console.error(err);
      alert("Failed to create playlist");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this playlist?")) return;
    try {
      await deletePlaylist(id);
      setPlaylists(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete playlist");
    }
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold", margin: 0 }}>Playlists</h1>
        <button className="primary-btn" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={handleCreate}>
          <Plus size={16} /> New Playlist
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {playlists.map((playlist) => (
          <div 
            key={playlist.id}
            style={{
              padding: 16,
              backgroundColor: "var(--bg-lighter)",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12
            }}
            onClick={() => navigate(`/playlists/${playlist.id}`)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ListMusic size={24} color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 600 }}>{playlist.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{playlist.trackCount} tracks</div>
              </div>
            </div>
            <button 
              onClick={(e) => handleDelete(e, playlist.id)}
              style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 4 }}
              title="Delete Playlist"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      
      {loading && <div style={{ marginTop: 24, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>}
      {!loading && playlists.length === 0 && (
        <div style={{ marginTop: 24, textAlign: "center", color: "var(--text-muted)" }}>No playlists found. Create one to get started!</div>
      )}
    </div>
  );
}

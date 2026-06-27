import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Playlist } from "@mugisk/shared-types";
import { getPlaylists, createPlaylist, deletePlaylist } from "../api/library";
import { generateSmartPlaylist } from "../api/ai";
import { ListMusic, Plus, Trash2, Sparkles } from "lucide-react";

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

  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerateSmartPlaylist = async () => {
    try {
      setIsGenerating(true);
      const playlist = await generateSmartPlaylist();
      navigate(`/playlists/${playlist.id}`);
    } catch (err: any) {
      console.error(err);
      if (err?.response?.status === 403) {
        alert("AI features are currently unconfigured on the server.");
      } else {
        alert("Failed to generate smart playlist");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await createPlaylist(newPlaylistName.trim());
      fetchPlaylists();
      setNewPlaylistName("");
      setIsCreating(false);
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
        {isCreating ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input 
              type="text" 
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name"
              style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg-lighter)", color: "var(--text)" }}
              autoFocus
              onKeyDown={e => { 
                if (e.key === 'Enter') handleCreate(); 
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewPlaylistName("");
                }
              }}
            />
            <button className="primary-btn" onClick={handleCreate}>Save</button>
            <button onClick={() => {
              setIsCreating(false);
              setNewPlaylistName("");
            }} style={{ background: "none", border: "1px solid var(--border)", color: "var(--text)", padding: "6px 12px", borderRadius: 4, cursor: "pointer" }}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              className="primary-btn" 
              style={{ display: "flex", alignItems: "center", gap: 8 }} 
              onClick={() => setIsCreating(true)}
            >
              <Plus size={16} /> New Playlist
            </button>
            <button 
              className="primary-btn"
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 8, 
                background: "var(--primary-dim)", 
                color: "var(--primary)",
                border: "1px solid var(--primary)"
              }} 
              onClick={handleGenerateSmartPlaylist}
              disabled={isGenerating}
              title={isGenerating ? "Analyzing your music taste..." : "Generate AI Smart Playlist"}
            >
              <Sparkles size={16} /> {isGenerating ? "Analyzing your music taste..." : "Generate Smart Playlist"}
            </button>
          </div>
        )}
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

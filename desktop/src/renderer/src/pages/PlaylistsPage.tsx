import React, { useEffect, useState } from "react";
import { ListMusic, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getPlaylists, createPlaylist, type PlaylistItem } from "@renderer/api/library";

export default function PlaylistsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = () => {
    setLoading(true);
    getPlaylists()
      .then((res) => setPlaylists(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleCreate = () => {
    const name = prompt("Enter playlist name:");
    if (!name?.trim()) return;
    createPlaylist(name)
      .then(() => loadPlaylists())
      .catch(console.error);
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Playlists</h1>
        <button
          onClick={handleCreate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--bg-elevated)",
            color: "var(--text-main)",
            border: "1px solid var(--border)",
            padding: "8px 16px",
            borderRadius: 20,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <Plus size={16} />
          New Playlist
        </button>
      </div>

      <p className="page-subtitle">
        {playlists.length > 0 ? `${playlists.length} playlists` : "No playlists found"}
      </p>

      {playlists.length === 0 ? (
        <div className="empty-state">
          <ListMusic size={48} />
          <span>You don't have any playlists yet</span>
        </div>
      ) : (
        <div className="genre-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginTop: 24 }}>
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => navigate(`/playlists/${pl.id}`)}
              style={{
                background: "var(--card-bg)",
                padding: 24,
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--card-bg)")}
            >
              <div style={{ marginBottom: 8 }}>
                <ListMusic size={32} color="var(--text-muted)" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pl.name}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {pl._count.tracks} track{pl._count.tracks !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

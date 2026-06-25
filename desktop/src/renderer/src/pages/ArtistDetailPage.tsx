import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Artist, Album } from "@mugisk/shared-types";
import { getArtist, getArtistAlbums } from "../api/library";
import { getServerUrlSync } from "../api/axios";
import { ArrowLeft, Mic2, Disc3 } from "lucide-react";

export default function ArtistDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getArtist(id), getArtistAlbums(id)])
      .then(([a, al]) => {
        setArtist(a);
        setAlbums(al);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 24, color: "var(--text-muted)" }}>Loading artist...</div>;
  if (!artist) return <div style={{ padding: 24 }}>Artist not found.</div>;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      <button 
        style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", marginBottom: 24 }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: 48 }}>
        <div style={{ width: 200, height: 200, backgroundColor: "var(--bg-lighter)", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {artist.imageUrl || artist.coverArtId ? (
            <img 
              src={`${getServerUrlSync()}${artist.imageUrl || artist.coverArtId}`} 
              alt={artist.name} 
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <Mic2 size={64} color="var(--text-muted)" />
          )}
        </div>
        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600, letterSpacing: 1, color: "var(--text-muted)", marginBottom: 8 }}>Artist</div>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: "0 0 8px 0" }}>{artist.name}</h1>
          <div style={{ fontSize: 16, color: "var(--text-muted)" }}>
            {artist.albumCount} albums • {artist.trackCount} tracks
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>Albums</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 24 }}>
        {albums.map((album) => (
          <div 
            key={album.id} 
            className="album-card" 
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/albums/${album.id}`)}
          >
            <div style={{ 
              width: "100%", 
              aspectRatio: "1/1", 
              backgroundColor: "var(--bg-lighter)", 
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              marginBottom: 8
            }}>
              {album.coverArtId ? (
                <img 
                  src={`${getServerUrlSync()}${album.coverArtId}`} 
                  alt={album.title} 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <Disc3 size={48} color="var(--text-muted)" />
              )}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {album.title}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {album.year || ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

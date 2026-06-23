import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Mic2 } from "lucide-react";

import { getArtist, type ArtistDetail } from "@renderer/api/library";
import AlbumCard from "@renderer/components/AlbumCard";

export default function ArtistDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getArtist(id)
      .then(setArtist)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="empty-state">
        <Mic2 size={48} />
        <span>Artist not found</span>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 40 }}>
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: 100, // Circular for artists
            overflow: "hidden",
            background: "var(--card-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {artist.imageUrl ? (
            <img src={artist.imageUrl} alt={artist.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Mic2 size={64} color="var(--text-muted)" />
          )}
        </div>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)" }}>Artist</span>
          <h1 style={{ fontSize: 64, fontWeight: 800, margin: "8px 0 16px", lineHeight: 1.1 }}>{artist.name}</h1>
          <div style={{ color: "var(--text-muted)" }}>
            {artist.albums.length} album{artist.albums.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {artist.bio && (
        <section style={{ marginBottom: 40, maxWidth: 800 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>About</h2>
          <p style={{ lineHeight: 1.6, color: "var(--text-muted)" }}>{artist.bio}</p>
        </section>
      )}

      {/* Albums */}
      <section>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Albums</h2>
        {artist.albums.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>No albums found for this artist.</div>
        ) : (
          <div className="album-grid">
            {artist.albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={{
                  id: album.id,
                  title: album.title,
                  year: album.year,
                  coverUrl: album.coverUrl,
                  artist: { id: artist.id, name: artist.name },
                  _count: { tracks: album._count.tracks },
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

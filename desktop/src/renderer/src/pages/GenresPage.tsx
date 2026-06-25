import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag } from "lucide-react";

import { getGenres, type GenreItem } from "@renderer/api/library";

export default function GenresPage(): React.JSX.Element {
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getGenres()
      .then((res) => setGenres(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Genres</h1>
      <p className="page-subtitle">
        {genres.length > 0 ? `${genres.length} genres` : "No genres found"}
      </p>

      {genres.length === 0 ? (
        <div className="empty-state">
          <Tag size={48} />
          <span>No genres in your library yet</span>
        </div>
      ) : (
        <div className="genre-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginTop: 24 }}>
          {genres.map((genre) => (
            <div
              key={genre.genre}
              className="genre-card hover-card"
              onClick={() => navigate(`/library/songs?genre=${encodeURIComponent(genre.genre)}`)}
              style={{ background: "var(--card-bg)", padding: 24, borderRadius: 8, display: "flex", flexDirection: "column", gap: 8, cursor: "pointer", transition: "background 0.2s" }}
            >
              <span style={{ fontSize: 18, fontWeight: 600, color: "var(--text-main)" }}>{genre.genre}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{genre.trackCount} track{genre.trackCount !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGenres, type GenreCount } from "../../api/library";
import { Tag } from "lucide-react";

export default function GenresView(): React.JSX.Element {
  const navigate = useNavigate();
  const [genres, setGenres] = useState<GenreCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGenres()
      .then(setGenres)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "0 24px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {genres.map((g) => (
          <div 
            key={g.genre}
            style={{
              padding: 16,
              backgroundColor: "var(--bg-lighter)",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12
            }}
            onClick={() => navigate(`/library/songs?genre=${encodeURIComponent(g.genre)}`)}
          >
            <Tag size={24} color="var(--primary)" />
            <div>
              <div style={{ fontWeight: 600 }}>{g.genre}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{g.trackCount} tracks</div>
            </div>
          </div>
        ))}
      </div>
      
      {loading && <div style={{ marginTop: 24, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>}
    </div>
  );
}

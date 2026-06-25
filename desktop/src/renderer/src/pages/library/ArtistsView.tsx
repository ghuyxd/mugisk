import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Artist } from "@mugisk/shared-types";
import { getArtists } from "../../api/library";
import { getServerUrlSync } from "../../api/axios";
import { Mic2 } from "lucide-react";

export default function ArtistsView(): React.JSX.Element {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchArtists = async (p: number) => {
    try {
      setLoading(true);
      const res = await getArtists(p, 50);
      if (p === 1) {
        setArtists(res.items);
      } else {
        setArtists(prev => [...prev, ...res.items]);
      }
      setHasNext(res.hasNextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists(1);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArtists(nextPage);
  };

  return (
    <div style={{ padding: "0 24px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 24 }}>
        {artists.map((artist) => (
          <div 
            key={artist.id} 
            className="artist-card" 
            style={{ cursor: "pointer", textAlign: "center" }}
            onClick={() => navigate(`/artists/${artist.id}`)}
          >
            <div style={{ 
              width: "100%", 
              aspectRatio: "1/1", 
              backgroundColor: "var(--bg-lighter)", 
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              marginBottom: 12
            }}>
              {artist.imageUrl || artist.coverArtId ? (
                <img 
                  src={`${getServerUrlSync()}${artist.imageUrl || artist.coverArtId}`} 
                  alt={artist.name} 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <Mic2 size={48} color="var(--text-muted)" />
              )}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {artist.name}
            </div>
          </div>
        ))}
      </div>

      {loading && <div style={{ marginTop: 24, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>}
      
      {hasNext && !loading && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button className="primary-btn" onClick={handleLoadMore}>
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

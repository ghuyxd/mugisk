import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Album } from "@mugisk/shared-types";
import { getAlbums } from "../../api/library";
import { getServerUrlSync } from "../../api/axios";
import { useFavorites } from "../../context/FavoritesContext";
import { Disc3 } from "lucide-react";

export default function AlbumsView(): React.JSX.Element {
  const navigate = useNavigate();
  const { toggleFavoriteAlbum } = useFavorites();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAlbums = async (p: number) => {
    try {
      setLoading(true);
      const res = await getAlbums(p, 50);
      if (p === 1) {
        setAlbums(res.items);
      } else {
        setAlbums(prev => [...prev, ...res.items]);
      }
      setHasNext(res.hasNextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums(1);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchAlbums(nextPage);
  };

  return (
    <div style={{ padding: "0 24px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 24 }}>
        {albums.map((album) => (
          <div 
            key={album.id} 
            className="album-card" 
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/albums/${album.id}`)}
            onContextMenu={(e) => {
              e.preventDefault();
              toggleFavoriteAlbum(album.id);
            }}
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
                  // In a real app we'd fetch a dedicated image endpoint without short-lived tokens,
                  // or have a service worker attach the token. For now we use a broken img or just placeholder if token is needed.
                  // Actually, let's just use the placeholder for now since we don't have the token handy for all images.
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
              {album.artist}
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

import React, { useEffect, useRef, useState } from "react";
import { Mic2 } from "lucide-react";

import { getArtists, type ArtistItem } from "@renderer/api/library";
import ArtistCard from "@renderer/components/ArtistCard";

const PAGE_SIZE = 30;

export default function ArtistsPage(): React.JSX.Element {
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getArtists({ page: 1, limit: PAGE_SIZE })
      .then((res) => {
        setArtists(res.data);
        setTotalPages(res.meta.totalPages);
        setPage(1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages && !loadingMore) {
          const next = page + 1;
          setLoadingMore(true);
          getArtists({ page: next, limit: PAGE_SIZE })
            .then((res) => {
              setArtists((prev) => [...prev, ...res.data]);
              setPage(next);
            })
            .catch(console.error)
            .finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [page, totalPages, loadingMore]);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Artists</h1>
      <p className="page-subtitle">
        {artists.length > 0 ? `${artists.length} artists` : "No artists found"}
      </p>

      {artists.length === 0 ? (
        <div className="empty-state">
          <Mic2 size={48} />
          <span>No artists in your library yet</span>
        </div>
      ) : (
        <div className="artist-grid">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}

      <div ref={loadMoreRef} style={{ height: 1 }} />
      {loadingMore && (
        <div className="load-more-spinner">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}

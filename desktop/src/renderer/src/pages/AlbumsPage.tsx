import React, { useEffect, useRef, useState } from "react";
import { Disc3 } from "lucide-react";

import { getAlbums, type AlbumItem } from "@renderer/api/library";
import AlbumCard from "@renderer/components/AlbumCard";

const PAGE_SIZE = 30;

export default function AlbumsPage(): React.JSX.Element {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    setLoading(true);
    getAlbums({ page: 1, limit: PAGE_SIZE })
      .then((res) => {
        setAlbums(res.data);
        setTotalPages(res.meta.totalPages);
        setPage(1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages && !loadingMore) {
          const nextPage = page + 1;
          setLoadingMore(true);
          getAlbums({ page: nextPage, limit: PAGE_SIZE })
            .then((res) => {
              setAlbums((prev) => [...prev, ...res.data]);
              setPage(nextPage);
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
      <h1 className="page-title">Albums</h1>
      <p className="page-subtitle">{albums.length > 0 ? `${albums.length} albums` : "No albums found"}</p>

      {albums.length === 0 ? (
        <div className="empty-state">
          <Disc3 size={48} />
          <span>No albums in your library yet</span>
        </div>
      ) : (
        <div className="album-grid">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}

      {/* Sentinel for infinite scroll */}
      <div ref={loadMoreRef} style={{ height: 1 }} />
      {loadingMore && (
        <div className="load-more-spinner">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}

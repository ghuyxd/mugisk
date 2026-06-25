import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Music2 } from "lucide-react";

import { getTracks, type TrackItem } from "@renderer/api/library";
import TrackRow from "@renderer/components/TrackRow";
import AddToPlaylistModal from "@renderer/components/AddToPlaylistModal";
import type { QueueTrack } from "@renderer/context/PlayerContext";

const PAGE_SIZE = 50;

export default function TracksPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const genreFilter = searchParams.get("genre");

  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<QueueTrack | null>(null);

  useEffect(() => {
    setLoading(true);
    getTracks({ page: 1, limit: PAGE_SIZE, genre: genreFilter || undefined })
      .then((res) => {
        setTracks(res.data);
        setTotalPages(res.meta.totalPages);
        setPage(1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [genreFilter]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages && !loadingMore) {
          const next = page + 1;
          setLoadingMore(true);
          getTracks({ page: next, limit: PAGE_SIZE, genre: genreFilter || undefined })
            .then((res) => {
              setTracks((prev) => [...prev, ...res.data]);
              setPage(next);
            })
            .catch(console.error)
            .finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [page, totalPages, loadingMore, genreFilter]);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">{genreFilter ? `Songs: ${genreFilter}` : "Songs"}</h1>
      <p className="page-subtitle">
        {tracks.length > 0 ? `${tracks.length} songs` : "No songs found"}
      </p>

      {tracks.length === 0 ? (
        <div className="empty-state">
          <Music2 size={48} />
          <span>No songs in your library yet</span>
        </div>
      ) : (
        <div className="track-list" style={{ marginTop: 24 }}>
          {tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i + 1}
              onAddToPlaylist={setAddToPlaylistTrack}
            />
          ))}
        </div>
      )}

      <div ref={loadMoreRef} style={{ height: 1 }} />
      {loadingMore && (
        <div className="load-more-spinner">
          <div className="spinner" />
        </div>
      )}

      {addToPlaylistTrack && (
        <AddToPlaylistModal
          track={addToPlaylistTrack}
          onClose={() => setAddToPlaylistTrack(null)}
        />
      )}
    </div>
  );
}

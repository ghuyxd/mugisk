import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { searchAll, type SearchResults } from "@renderer/api/library";
import TrackRow from "@renderer/components/TrackRow";
import AlbumCard from "@renderer/components/AlbumCard";
import ArtistCard from "@renderer/components/ArtistCard";

export default function SearchPage(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      searchAll(query)
        .then(setResults)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="search-page" style={{ paddingBottom: 40 }}>
      <div style={{ position: "relative", marginBottom: 32 }}>
        <Search
          size={20}
          style={{ position: "absolute", left: 16, top: 16, color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="What do you want to listen to?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "16px 16px 16px 48px",
            fontSize: 16,
            borderRadius: 24,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-main)",
            outline: "none",
          }}
        />
      </div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && !results && query.trim() && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <span>Press Enter or wait to search</span>
        </div>
      )}

      {!loading && results && (
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {/* Tracks */}
          {results.tracks.length > 0 && (
            <section>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Songs</h2>
              <div className="track-list">
                {results.tracks.map((track, i) => (
                  <TrackRow key={track.id} track={track} index={i + 1} />
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {results.albums.length > 0 && (
            <section>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Albums</h2>
              <div className="album-grid">
                {results.albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {results.artists.length > 0 && (
            <section>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Artists</h2>
              <div className="artist-grid">
                {results.artists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </section>
          )}

          {results.tracks.length === 0 &&
            results.albums.length === 0 &&
            results.artists.length === 0 && (
              <div className="empty-state" style={{ marginTop: 40 }}>
                <span>No results found for "{query}"</span>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

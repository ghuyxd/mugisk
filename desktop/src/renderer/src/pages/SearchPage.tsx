import React, { useEffect, useState, useRef } from "react";
import { Search, Clock, Disc3, Play, X } from "lucide-react";
import { getExplorePlaylists } from "../api/ai";
import { getTracks } from "../api/library";
import { getServerUrlSync } from "../api/axios";
import type { Playlist, Track } from "@mugisk/shared-types";
import { usePlayer } from "../context/PlayerContext";
import { useNavigate } from "react-router-dom";

export default function SearchPage(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [explorePlaylists, setExplorePlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [searchResults, setSearchResults] = useState<Track[] | null>(null);
  const player = usePlayer();
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
    }
  }, [query]);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) { }
    }

    // Load AI Explore playlists
    getExplorePlaylists()
      .then(setExplorePlaylists)
      .catch(console.error)
      .finally(() => setLoadingPlaylists(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    // Update recent searches
    const term = query.trim();
    const updated = [term, ...recentSearches.filter(t => t !== term)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));

    try {
      const res = await getTracks(1, 50, term);
      setSearchResults(res.items);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    }
  };

  const removeRecentSearch = (term: string) => {
    const updated = recentSearches.filter(t => t !== term);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const handleRecentClick = async (term: string) => {
    setQuery(term);
    try {
      const res = await getTracks(1, 50, term);
      setSearchResults(res.items);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    }
  };

  const handlePlayPlaylist = (playlist: Playlist) => {
    const tracks: Track[] = playlist.tracks?.map((pt: any) => {
      const t = pt.track;
      if (!t) return t;
      return {
        ...t,
        artist: t.artist?.name || "Unknown Artist",
        album: t.album?.title || "Unknown Album",
        duration: t.durationSeconds ?? t.duration ?? 0,
        coverArtId: t.album?.coverUrl || t.coverArtId || undefined
      };
    }) || [];
    if (tracks.length > 0) {
      player.playTrack(tracks[0], tracks, 0);
    }
  };

  const handlePlayTrack = (track: Track, index: number) => {
    if (searchResults) {
      player.playTrack(track, searchResults, index);
    }
  };

  const gradients = [
    "linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)",
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
    "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)"
  ];

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "24px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24, marginTop: 0 }}>Search</h1>

      <form onSubmit={handleSearch} style={{ position: "relative", marginBottom: 32, maxWidth: 600 }}>
        <Search style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artists, Songs, or Albums"
          style={{
            width: "100%",
            padding: "16px 16px 16px 48px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            color: "var(--text)",
            fontSize: 16,
            outline: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            transition: "all var(--transition)"
          }}
          onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
          onBlur={(e) => e.target.style.borderColor = "var(--border)"}
        />
      </form>

      {searchResults !== null ? (
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Top Results</h2>
          {searchResults.length === 0 ? (
            <div style={{ color: "var(--text-muted)" }}>No results found for "{query}".</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 24 }}>
              {searchResults.map((track, idx) => (
                <div 
                  key={track.id} 
                  className="album-card" 
                  style={{ cursor: "pointer", position: "relative" }}
                  onClick={() => handlePlayTrack(track, idx)}
                >
                  <div style={{ 
                    width: "100%", 
                    aspectRatio: "1/1", 
                    backgroundColor: "var(--bg-lighter)", 
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    marginBottom: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                    position: "relative"
                  }} className="card-image-container">
                    {track.coverArtId ? (
                      <img 
                        src={`${getServerUrlSync()}${track.coverArtId}`} 
                        alt={track.title} 
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Disc3 size={48} color="var(--text-muted)" />
                    )}
                    <div className="card-play-overlay">
                      <Play size={24} fill="currentColor" />
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                    {track.title}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {track.artist}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {recentSearches.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Recent Searches</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {recentSearches.map(term => (
                  <div 
                    key={term} 
                    style={{ 
                      display: "flex", alignItems: "center", gap: 8, 
                      background: "var(--surface-2)", padding: "8px 16px", 
                      borderRadius: 99, border: "1px solid var(--border)",
                      cursor: "pointer", transition: "background var(--transition)"
                    }}
                    className="recent-search-pill"
                    onClick={() => handleRecentClick(term)}
                  >
                    <Clock size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{term}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeRecentSearch(term); }}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Explore</h2>
            {loadingPlaylists ? (
              <div style={{ color: "var(--text-muted)" }}>Generating personalized playlists...</div>
            ) : explorePlaylists.length === 0 ? (
              <div style={{ color: "var(--text-muted)" }}>Could not generate explore playlists at this time.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 24 }}>
                {explorePlaylists.map((playlist, idx) => (
                  <div 
                    key={playlist.id} 
                    className="album-card"
                    style={{ cursor: "pointer", position: "relative" }}
                    onClick={() => handlePlayPlaylist(playlist)}
                  >
                    <div style={{ 
                      width: "100%", 
                      aspectRatio: "16/9", 
                      background: gradients[idx % gradients.length], 
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      marginBottom: 12,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                      position: "relative",
                      color: "#1e1e2e"
                    }} className="card-image-container">
                      <div style={{ position: "absolute", top: 16, left: 16, right: 16, bottom: 16, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                        <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0, textShadow: "0 2px 8px rgba(255,255,255,0.4)", lineHeight: 1.1 }}>{playlist.name}</h3>
                      </div>
                      <div className="card-play-overlay">
                        <Play size={24} fill="currentColor" />
                      </div>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 13, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {playlist.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

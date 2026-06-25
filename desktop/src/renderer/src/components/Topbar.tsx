import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Minus,
  Search,
  Settings,
  Square,
  User,
  X,
  Music,
  Disc3,
  Mic2
} from "lucide-react";
import type { Track, Album, Artist } from "@mugisk/shared-types";

import { useAuth } from "@renderer/context/AuthContext";
import { usePlayer } from "@renderer/context/PlayerContext";
import { getTracks, getAlbums, getArtists } from "@renderer/api/library";

export default function Topbar(): React.JSX.Element {
  const { logout } = useAuth();
  const player = usePlayer();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Search state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Close search on outside click
  useEffect(() => {
    if (!showSearch) return;
    const handler = (e: MouseEvent): void => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSearch]);

  const handleLogout = useCallback(async () => {
    setMenuOpen(false);
    await logout();
  }, [logout]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Perform search
  useEffect(() => {
    if (!debouncedQuery) {
      setTracks([]);
      setAlbums([]);
      setArtists([]);
      return;
    }
    
    let cancelled = false;
    setIsSearching(true);
    
    Promise.all([
      getTracks(1, 5, debouncedQuery),
      getAlbums(1, 5, debouncedQuery),
      getArtists(1, 5, debouncedQuery)
    ]).then(([t, al, ar]) => {
      if (cancelled) return;
      setTracks(t.items);
      setAlbums(al.items);
      setArtists(ar.items);
    }).catch(console.error).finally(() => {
      if (!cancelled) setIsSearching(false);
    });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSearchFocus = () => {
    if (query) setShowSearch(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSearch(true);
  };

  const playTrack = (track: Track) => {
    player.playTrack(track, [track], 0);
    setShowSearch(false);
  };

  const navToAlbum = (id: string) => {
    navigate(`/albums/${id}`);
    setShowSearch(false);
  };

  const navToArtist = (id: string) => {
    navigate(`/artists/${id}`);
    setShowSearch(false);
  };

  return (
    <header className="topbar">
      {/* Search bar */}
      <div className="topbar-search" ref={searchRef} style={{ position: "relative" }}>
        <span className="topbar-search-icon">
          <Search size={14} />
        </span>
        <input
          id="topbar-search-input"
          type="text"
          placeholder="Search your library…"
          value={query}
          onChange={handleSearchChange}
          onFocus={handleSearchFocus}
        />
        
        {/* Search Dropdown */}
        {showSearch && query && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 8,
            backgroundColor: "var(--bg-lighter)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            zIndex: 1000,
            maxHeight: 400,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column"
          }}>
            {isSearching && <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 12 }}>Searching...</div>}
            
            {!isSearching && tracks.length === 0 && albums.length === 0 && artists.length === 0 && (
              <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 12 }}>No results found</div>
            )}

            {!isSearching && tracks.length > 0 && (
              <div style={{ padding: "8px 0" }}>
                <div style={{ padding: "4px 12px", fontSize: 11, fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)" }}>Songs</div>
                {tracks.map(t => (
                  <div key={t.id} className="search-result-item" onClick={() => playTrack(t)}>
                    <Music size={14} />
                    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                      <span style={{ fontSize: 13, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{t.title}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{t.artist}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && albums.length > 0 && (
              <div style={{ padding: "8px 0", borderTop: tracks.length > 0 ? "1px solid var(--border)" : "none" }}>
                <div style={{ padding: "4px 12px", fontSize: 11, fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)" }}>Albums</div>
                {albums.map(a => (
                  <div key={a.id} className="search-result-item" onClick={() => navToAlbum(a.id)}>
                    <Disc3 size={14} />
                    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                      <span style={{ fontSize: 13, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{a.title}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{a.artist}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && artists.length > 0 && (
              <div style={{ padding: "8px 0", borderTop: (tracks.length > 0 || albums.length > 0) ? "1px solid var(--border)" : "none" }}>
                <div style={{ padding: "4px 12px", fontSize: 11, fontWeight: "bold", textTransform: "uppercase", color: "var(--text-muted)" }}>Artists</div>
                {artists.map(a => (
                  <div key={a.id} className="search-result-item" onClick={() => navToArtist(a.id)}>
                    <Mic2 size={14} />
                    <span style={{ fontSize: 13, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="topbar-spacer" />

      {/* Avatar + user menu */}
      <div style={{ position: "relative" }} ref={menuRef}>
        <button
          id="topbar-avatar-btn"
          className="topbar-avatar"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="User menu"
        >
          <User size={14} />
        </button>

        {menuOpen && (
          <div className="user-menu">
            <button
              className="user-menu-item"
              onClick={() => {
                setMenuOpen(false);
                navigate("/settings");
              }}
            >
              <Settings size={14} />
              Settings
            </button>
            <div className="user-menu-divider" />
            <button
              id="topbar-logout-btn"
              className="user-menu-item danger"
              onClick={handleLogout}
            >
              <LogOut size={14} />
              Log out
            </button>
          </div>
        )}
      </div>

      {/* Window controls */}
      <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
        <button
          className="titlebar-btn"
          onClick={() => window.api.window.minimize()}
          aria-label="Minimize"
        >
          <Minus size={12} />
        </button>
        <button
          className="titlebar-btn"
          onClick={() => window.api.window.maximize()}
          aria-label="Maximize"
        >
          <Square size={11} />
        </button>
        <button
          className="titlebar-btn close"
          onClick={() => window.api.window.close()}
          aria-label="Close"
        >
          <X size={12} />
        </button>
      </div>
    </header>
  );
}

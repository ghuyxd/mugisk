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
  Play,
  Disc3,
  Mic2,
} from "lucide-react";

import { useAuth } from "@renderer/context/AuthContext";
import { usePlayer } from "@renderer/context/PlayerContext";
import { searchAll, type SearchResults } from "@renderer/api/library";

export default function Topbar(): React.JSX.Element {
  const { logout } = useAuth();
  const { playTrack } = usePlayer();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      setLoadingSearch(true);
      searchAll(query)
        .then(setResults)
        .catch(console.error)
        .finally(() => setLoadingSearch(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, searchOpen]);

  const handleLogout = useCallback(async () => {
    setMenuOpen(false);
    await logout();
  }, [logout]);

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
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSearchOpen(false);
              navigate("/search");
            }
          }}
        />

        {searchOpen && query.trim() && (
          <div className="search-dropdown" style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4, zIndex: 50, maxHeight: 400, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", padding: 8 }}>
            {loadingSearch ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading...</div>
            ) : results ? (
              <>
                {results.tracks.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", padding: "4px 8px" }}>Songs</div>
                    {results.tracks.map((t) => (
                      <div
                        key={t.id}
                        className="search-dropdown-item"
                        onClick={() => {
                          setSearchOpen(false);
                          playTrack({
                            id: t.id,
                            title: t.title,
                            artistName: t.artist.name,
                            albumTitle: t.album.title,
                            coverUrl: t.album.coverUrl,
                            durationSeconds: t.durationSeconds,
                          });
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 4, cursor: "pointer" }}
                      >
                        <Play size={14} style={{ flexShrink: 0 }} />
                        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                          <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.artist.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {results.albums.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", padding: "4px 8px" }}>Albums</div>
                    {results.albums.map((a) => (
                      <div
                        key={a.id}
                        className="search-dropdown-item"
                        onClick={() => {
                          setSearchOpen(false);
                          navigate(`/albums/${a.id}`);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 4, cursor: "pointer" }}
                      >
                        <Disc3 size={14} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {results.artists.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", padding: "4px 8px" }}>Artists</div>
                    {results.artists.map((a) => (
                      <div
                        key={a.id}
                        className="search-dropdown-item"
                        onClick={() => {
                          setSearchOpen(false);
                          navigate(`/artists/${a.id}`);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 4, cursor: "pointer" }}
                      >
                        <Mic2 size={14} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {results.tracks.length === 0 && results.albums.length === 0 && results.artists.length === 0 && (
                  <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No results found</div>
                )}
              </>
            ) : null}
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

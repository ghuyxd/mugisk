import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Settings,
  User,
} from "lucide-react";

import { useAuth } from "@renderer/context/AuthContext";

export default function Topbar(): React.JSX.Element {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleLogout = useCallback(async () => {
    setMenuOpen(false);
    await logout();
  }, [logout]);

  return (
    <header className="topbar">

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

    </header>
  );
}

import React, { useEffect, useState } from "react";
import { LogOut, Moon, Server, Sun } from "lucide-react";

import { useAuth } from "@renderer/context/AuthContext";
import { useTheme } from "@renderer/context/ThemeContext";

export default function SettingsPage(): React.JSX.Element {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [serverUrl, setServerUrl] = useState<string>("—");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    window.api.store
      .get("serverUrl")
      .then((url) => setServerUrl((url as string) || "—"))
      .catch(() => setServerUrl("—"));
  }, []);

  const handleLogout = async (): Promise<void> => {
    setLoggingOut(true);
    await logout();
  };

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage your app preferences and account.</p>

      {/* Connection */}
      <div className="settings-section">
        <div className="settings-section-title">Connection</div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">
              <Server size={13} style={{ display: "inline", marginRight: 6 }} />
              Server URL
            </div>
          </div>
          <span className="settings-row-value">{serverUrl}</span>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <div className="settings-section-title">Appearance</div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">
              {theme === "dark" ? (
                <Moon size={13} style={{ display: "inline", marginRight: 6 }} />
              ) : (
                <Sun size={13} style={{ display: "inline", marginRight: 6 }} />
              )}
              {theme === "dark" ? "Dark mode" : "Light mode"}
            </div>
          </div>
          <label className="toggle" aria-label="Toggle theme">
            <input
              id="settings-theme-toggle"
              type="checkbox"
              checked={theme === "light"}
              onChange={toggleTheme}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {/* Account */}
      <div className="settings-section">
        <div className="settings-section-title">Account</div>

        <div className="settings-row">
          <div className="settings-row-label">Sign out of Mugisk</div>
          <button
            id="settings-logout-btn"
            className="btn-ghost"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{ color: "var(--error)", borderColor: "rgba(244, 63, 94, 0.25)" }}
          >
            <LogOut size={13} style={{ display: "inline", marginRight: 6 }} />
            {loggingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      </div>

      {/* App info */}
      <div
        style={{
          fontSize: 11,
          color: "var(--text-subtle)",
          marginTop: 24,
          textAlign: "center",
        }}
      >
        Mugisk Desktop v0.1.0 · Phase 6
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/adminFetch";

interface StatsResponse {
  config: {
    musicLibraryPath: string | null;
    aiKeyConfigured: boolean;
  };
}

export default function SettingsPage() {
  const [config, setConfig] = useState<StatsResponse["config"] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiJson<StatsResponse>("/api/admin/stats")
      .then((data) => setConfig(data.config))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Server configuration — read-only</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="settings-section">
        <div className="settings-section-header">Server Configuration</div>

        <div className="settings-row">
          <div>
            <div className="settings-key">MUSIC_LIBRARY_PATH</div>
            <div className="settings-desc">
              Directory the server scans for audio files
            </div>
          </div>
          <div className="settings-value">
            {config === null ? (
              <span style={{ color: "var(--color-muted)", opacity: 0.5 }}>Loading…</span>
            ) : config.musicLibraryPath ? (
              <code
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  padding: "0.1rem 0.4rem",
                  fontSize: "0.82rem",
                }}
              >
                {config.musicLibraryPath}
              </code>
            ) : (
              <span style={{ color: "var(--color-danger)" }}>Not configured</span>
            )}
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-key">AI_API_KEY</div>
            <div className="settings-desc">
              API key for AI-powered tag generation (key is never displayed)
            </div>
          </div>
          <div className="settings-value">
            {config === null ? (
              <span style={{ color: "var(--color-muted)", opacity: 0.5 }}>Loading…</span>
            ) : config.aiKeyConfigured ? (
              <span
                style={{
                  color: "var(--color-success)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  justifyContent: "flex-end",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--color-success)",
                    boxShadow: "0 0 6px var(--color-success)",
                    display: "inline-block",
                  }}
                />
                Configured
              </span>
            ) : (
              <span style={{ color: "var(--color-muted-light)" }}>Not configured</span>
            )}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">About</div>
        <div className="settings-row">
          <div>
            <div className="settings-key">Version</div>
            <div className="settings-desc">Mugisk server version</div>
          </div>
          <div className="settings-value">v0.1.0</div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-key">Phase</div>
            <div className="settings-desc">Current development phase</div>
          </div>
          <div className="settings-value">Phase 5 — Admin Panel</div>
        </div>
      </div>

      <div
        style={{
          marginTop: "1.5rem",
          padding: "0.875rem 1.25rem",
          background: "var(--color-accent-dim)",
          border: "1px solid var(--color-accent-border)",
          borderRadius: 10,
          fontSize: "0.82rem",
          color: "var(--color-muted-light)",
        }}
      >
        ℹ️ Settings are configured via environment variables on the server. To modify them, update
        your <code>.env</code> file and restart the server.
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/adminFetch";

interface StatsResponse {
  config: {
    musicLibraryPath: string | null;
    aiKeyConfigured: boolean;
    aiFeatureEnabled: boolean;
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
        <p className="page-subtitle">Server configuration</p>
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
          <div className="settings-value" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {config === null ? (
              <span style={{ color: "var(--color-muted)", opacity: 0.5 }}>Loading…</span>
            ) : (
              <>
                {config.aiKeyConfigured ? (
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
                    Key Configured
                  </span>
                ) : (
                  <span style={{ color: "var(--color-muted-light)" }}>Key not configured</span>
                )}
                {config.aiKeyConfigured && (
                  <button
                    onClick={async () => {
                      try {
                        const nextState = !config.aiFeatureEnabled;
                        const res = await fetch("/api/admin/settings", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                          body: JSON.stringify({ aiFeatureEnabled: nextState })
                        });
                        if (!res.ok) throw new Error("Failed to update");
                        setConfig({ ...config, aiFeatureEnabled: nextState });
                      } catch (err: any) {
                        setError(err.message);
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--color-border)",
                      background: config.aiFeatureEnabled ? "var(--color-primary)" : "var(--color-surface-3)",
                      color: config.aiFeatureEnabled ? "#fff" : "var(--color-text)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                  >
                    {config.aiFeatureEnabled ? "Enabled" : "Disabled"}
                  </button>
                )}
              </>
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
          <div className="settings-value">Phase 9 — Final Polish</div>
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

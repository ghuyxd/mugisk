import React, { useCallback, useState } from "react";
import { AlertCircle, Lock, Server } from "lucide-react";

import { login } from "@renderer/api/auth";
import { useAuth } from "@renderer/context/AuthContext";

export default function LoginPage(): React.JSX.Element {
  const { markAuthenticated } = useAuth();

  const [serverUrl, setServerUrl] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!serverUrl.trim()) {
        setError("Please enter the server URL.");
        return;
      }
      if (!identifier.trim() || !password) {
        setError("Please enter your email/username and password.");
        return;
      }

      setLoading(true);
      try {
        await login({ serverUrl: serverUrl.trim(), identifier: identifier.trim(), password });
        markAuthenticated();
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Login failed. Check your credentials.";
        // Surface cleaner messages for common axios errors
        if (msg.includes("Network Error") || msg.includes("ECONNREFUSED")) {
          setError("Cannot reach the server. Check the URL and try again.");
        } else if (msg.includes("401") || msg.includes("403")) {
          setError("Invalid email or password.");
        } else {
          setError("Login failed. Check your credentials and server URL.");
        }
      } finally {
        setLoading(false);
      }
    },
    [serverUrl, identifier, password, markAuthenticated],
  );

  return (
    <div className="login-page">
      {/* Background glow decoration */}
      <div className="login-bg-glow" aria-hidden />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">M</div>

        <h1 className="login-title">Welcome to Mugisk</h1>
        <p className="login-subtitle">Sign in to your music server</p>

        {error && (
          <div className="form-error" role="alert">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Server URL */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-server-url">
              <Server size={11} style={{ display: "inline", marginRight: 4 }} />
              Server URL
            </label>
            <input
              id="login-server-url"
              className={`form-input${error && !serverUrl ? " error" : ""}`}
              type="url"
              placeholder="http://localhost:3000"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              autoComplete="url"
              disabled={loading}
            />
          </div>

          {/* Email or username */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-identifier">
              Email or Username
            </label>
            <input
              id="login-identifier"
              className="form-input"
              type="text"
              placeholder="you@example.com or admin"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              <Lock size={11} style={{ display: "inline", marginRight: 4 }} />
              Password
            </label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span className="spinner" />
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

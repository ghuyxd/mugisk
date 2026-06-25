import React, { useCallback, useState } from "react";
import { AlertCircle, Lock, Server, User, Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { register } from "@renderer/api/auth";
import { useAuth } from "@renderer/context/AuthContext";

export default function RegisterPage(): React.JSX.Element {
  const { markAuthenticated } = useAuth();

  const [serverUrl, setServerUrl] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
      if (!email.trim() || !username.trim() || !password) {
        setError("Please fill in all fields.");
        return;
      }

      setLoading(true);
      try {
        await register({
          serverUrl: serverUrl.trim(),
          email: email.trim(),
          username: username.trim(),
          password,
        });
        markAuthenticated();
      } catch (err: any) {
        if (err.response?.data?.error) {
           setError(err.response.data.error);
        } else if (err.response?.data?.details) {
           const firstError = Object.values(err.response.data.details)[0];
           setError(Array.isArray(firstError) ? firstError[0] : "Validation failed");
        } else {
           const msg = err instanceof Error ? err.message : "Registration failed.";
           if (msg.includes("Network Error") || msg.includes("ECONNREFUSED")) {
             setError("Cannot reach the server. Check the URL and try again.");
           } else {
             setError("Registration failed. Please check your details.");
           }
        }
      } finally {
        setLoading(false);
      }
    },
    [serverUrl, email, username, password, markAuthenticated],
  );

  return (
    <div className="login-page">
      {/* Background glow decoration */}
      <div className="login-bg-glow" aria-hidden />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">M</div>

        <h1 className="login-title">Create Account</h1>
        <p className="login-subtitle">Join your music server</p>

        {error && (
          <div className="form-error" role="alert">
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Server URL */}
          <div className="form-group">
            <label className="form-label" htmlFor="register-server-url">
              <Server size={11} style={{ display: "inline", marginRight: 4 }} />
              Server URL
            </label>
            <input
              id="register-server-url"
              className={`form-input${error && !serverUrl ? " error" : ""}`}
              type="url"
              placeholder="http://localhost:3000"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              autoComplete="url"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              <Mail size={11} style={{ display: "inline", marginRight: 4 }} />
              Email
            </label>
            <input
              id="register-email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="register-username">
              <User size={11} style={{ display: "inline", marginRight: 4 }} />
              Username
            </label>
            <input
              id="register-username"
              className="form-input"
              type="text"
              placeholder="myusername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              <Lock size={11} style={{ display: "inline", marginRight: 4 }} />
              Password
            </label>
            <input
              id="register-password"
              className="form-input"
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 digit"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span className="spinner" />
                Registering…
              </span>
            ) : (
              "Sign up"
            )}
          </button>
          
          <div style={{ marginTop: 16, textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--primary)", textDecoration: "none" }}>
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

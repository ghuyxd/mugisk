"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveTokens } from "@/lib/adminFetch";
import { Suspense } from "react";
import type { Route } from "next";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string; role: string };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = (await res.json()) as LoginResponse & { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      if (data.user.role !== "ADMIN") {
        setError("Access denied: admin account required.");
        return;
      }

      saveTokens(data.accessToken, data.refreshToken);
      router.replace(from as Route);
    } catch {
      setError("Network error. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--color-bg)",
      }}
    >
      <div className="login-card">
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginBottom: "1.75rem",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background:
                "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "1.1rem",
              color: "#fff",
            }}
          >
            M
          </div>
          <div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--color-text)",
              }}
            >
              mugisk
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--color-muted-light)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Admin Panel
            </div>
          </div>
        </div>

        <h1
          style={{
            fontSize: "1.3rem",
            fontWeight: 700,
            color: "var(--color-text)",
            marginBottom: "1.5rem",
          }}
        >
          Sign in
        </h1>

        <form onSubmit={(e) => void handleSubmit(e)} id="admin-login-form">
          <div className="form-group">
            <label htmlFor="login-identifier" className="form-label">
              Email or username
            </label>
            <input
              id="login-identifier"
              type="text"
              className="form-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@mugisk.local"
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn--primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: "1.25rem", padding: "0.65rem" }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Signing in…
              </>
            ) : (
              "Sign in →"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

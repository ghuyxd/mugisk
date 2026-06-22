"use client";

import { useEffect, useState } from "react";
import { clearTokens, apiFetch } from "@/lib/adminFetch";
import { useRouter } from "next/navigation";
import type { Route } from "next";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface HeaderProps {
  onSessionLoaded?: (user: AdminUser) => void;
}

export function Header({ onSessionLoaded }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user: AdminUser }) => {
        setUser(data.user);
        onSessionLoaded?.(data.user);
      })
      .catch(() => {
        // apiFetch already redirects on 401/403
      });
  }, [onSessionLoaded]);

  async function handleLogout() {
    const refreshToken = localStorage.getItem("mugisk_refresh_token");
    if (refreshToken) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    clearTokens();
    router.push("/admin/login" as Route);
  }

  return (
    <header className="admin-header">
      <div className="admin-header-title">
        {user ? (
          <span className="admin-header-greeting">
            Logged in as{" "}
            <strong>{user.username}</strong>
            <span className="admin-header-role">{user.role}</span>
          </span>
        ) : (
          <span className="admin-header-greeting" style={{ opacity: 0.4 }}>
            Loading…
          </span>
        )}
      </div>
      <button
        id="admin-logout-btn"
        onClick={() => void handleLogout()}
        className="admin-logout-btn"
      >
        Sign out
      </button>
    </header>
  );
}

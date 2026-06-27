import React from "react";
import { createHashRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";

import { useAuth } from "@renderer/context/AuthContext";
import AppShell from "@renderer/components/AppShell";
import LoginPage from "@renderer/pages/LoginPage";
import HomePage from "@renderer/pages/HomePage";
import LibraryPage from "@renderer/pages/LibraryPage";
import PlaylistsPage from "@renderer/pages/PlaylistsPage";
import SearchPage from "@renderer/pages/SearchPage";
import SettingsPage from "@renderer/pages/SettingsPage";
import AlbumDetailPage from "@renderer/pages/AlbumDetailPage";
import ArtistDetailPage from "@renderer/pages/ArtistDetailPage";
import PlaylistDetailPage from "@renderer/pages/PlaylistDetailPage";
import FavoritesPage from "@renderer/pages/FavoritesPage";

import RegisterPage from "@renderer/pages/RegisterPage";

// ── Loading screen while auth state initialises ──────────────────────────────

function InitLoader(): React.JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
    </div>
  );
}

// ── Auth-aware guard ──────────────────────────────────────────────────────────

function RequireAuth(): React.JSX.Element {
  const { authenticated } = useAuth();

  if (authenticated === null) return <InitLoader />;
  if (!authenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequireGuest(): React.JSX.Element {
  const { authenticated } = useAuth();

  if (authenticated === null) return <InitLoader />;
  if (authenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

// ── Routes ────────────────────────────────────────────────────────────────────

const router = createHashRouter([
  {
    // Protected routes — wrapped in AppShell
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "library/favorites", element: <FavoritesPage /> },
          { path: "library", element: <LibraryPage /> },
          { path: "library/:tab", element: <LibraryPage /> },
          { path: "albums/:id", element: <AlbumDetailPage /> },
          { path: "artists/:id", element: <ArtistDetailPage /> },
          { path: "playlists", element: <PlaylistsPage /> },
          { path: "playlists/:id", element: <PlaylistDetailPage /> },
          { path: "search", element: <SearchPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    // Guest-only routes
    element: <RequireGuest />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
    ],
  },
]);

export default function AppRouter(): React.JSX.Element {
  return <RouterProvider router={router} />;
}

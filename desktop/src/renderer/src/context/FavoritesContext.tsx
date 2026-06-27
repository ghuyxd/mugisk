import React, { createContext, useContext, useEffect, useState } from "react";
import apiClient from "../api/axios";
import type { Track } from "@mugisk/shared-types";

interface FavoritesContextType {
  favorites: Track[];
  favoriteIds: Set<string>;
  loading: boolean;
  toggleFavorite: (trackId: string) => Promise<void>;
  toggleFavoriteAlbum: (albumId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    try {
      const res = await apiClient.get("/api/favorites");
      if (res.data.success) {
        setFavorites(res.data.data);
        setFavoriteIds(new Set(res.data.data.map((t: Track) => t.id)));
      }
    } catch (err) {
      console.error("Failed to fetch favorites", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavoriteAlbum = async (albumId: string) => {
    try {
      const res = await apiClient.post("/api/favorites/album", { albumId });
      if (res.data.success) {
        await fetchFavorites();
      }
    } catch (err) {
      console.error("Failed to toggle album favorite", err);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const toggleFavorite = async (trackId: string) => {
    try {
      // Optimistic update
      const isFav = favoriteIds.has(trackId);
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isFav) next.delete(trackId);
        else next.add(trackId);
        return next;
      });

      const res = await apiClient.post("/api/favorites", { trackId });
      
      // Actual update
      if (res.data.success) {
        await fetchFavorites();
      }
    } catch (err) {
      console.error("Failed to toggle favorite", err);
      // Revert optimistic update
      await fetchFavorites();
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, favoriteIds, loading, toggleFavorite, toggleFavoriteAlbum, refreshFavorites: fetchFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}

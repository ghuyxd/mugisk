/**
 * Library API — typed wrappers around all music library endpoints.
 * All calls go through the shared apiClient (axios with auto-refresh + baseURL injection).
 */

import apiClient from "./axios";

// ─── Shape helpers (what the server actually returns) ────────────────────────

export interface ArtistRef {
  id: string;
  name: string;
}

export interface AlbumRef {
  id: string;
  title: string;
  coverUrl: string | null;
  year?: number | null;
}

export interface TrackItem {
  id: string;
  title: string;
  trackNumber: number | null;
  discNumber: number | null;
  durationSeconds: number;
  genre: string | null;
  format: string;
  bitrate: number | null;
  createdAt?: string;
  artist: ArtistRef;
  album: AlbumRef & { year?: number | null };
}

export interface AlbumItem {
  id: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
  artist: ArtistRef;
  _count: { tracks: number };
}

export interface ArtistItem {
  id: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  _count: { albums: number; tracks: number };
}

export interface AlbumDetail extends AlbumItem {
  tracks: TrackItem[];
}

export interface ArtistDetail {
  id: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  albums: Array<{
    id: string;
    title: string;
    year: number | null;
    coverUrl: string | null;
    _count: { tracks: number };
  }>;
}

export interface GenreItem {
  genre: string;
  trackCount: number;
}

export interface PlaylistItem {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  _count: { tracks: number };
}

export interface PlaylistTrack {
  id: string;
  title: string;
  durationSeconds: number;
  genre: string | null;
  format: string;
  position: number;
  artist: ArtistRef;
  album: { id: string; title: string; coverUrl: string | null };
}

export interface PlaylistDetail {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  userId: string;
  tracks: PlaylistTrack[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Albums ──────────────────────────────────────────────────────────────────

export async function getAlbums(params?: {
  page?: number;
  limit?: number;
  search?: string;
  artistId?: string;
}): Promise<{ data: AlbumItem[]; meta: PaginationMeta }> {
  const { data } = await apiClient.get("/api/albums", { params });
  return data;
}

export async function getAlbum(id: string): Promise<AlbumDetail> {
  const { data } = await apiClient.get(`/api/albums/${id}`);
  return data;
}

// ─── Artists ─────────────────────────────────────────────────────────────────

export async function getArtists(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ data: ArtistItem[]; meta: PaginationMeta }> {
  const { data } = await apiClient.get("/api/artists", { params });
  return data;
}

export async function getArtist(id: string): Promise<ArtistDetail> {
  const { data } = await apiClient.get(`/api/artists/${id}`);
  return data;
}

// ─── Tracks ──────────────────────────────────────────────────────────────────

export async function getTracks(params?: {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  albumId?: string;
  artistId?: string;
  sortBy?: "title" | "createdAt" | "durationSeconds";
  sortOrder?: "asc" | "desc";
}): Promise<{ data: TrackItem[]; meta: PaginationMeta }> {
  const { data } = await apiClient.get("/api/tracks", { params });
  return data;
}

// ─── Genres ──────────────────────────────────────────────────────────────────

export async function getGenres(): Promise<{ data: GenreItem[] }> {
  const { data } = await apiClient.get("/api/genres");
  return data;
}

// ─── Playlists ───────────────────────────────────────────────────────────────

export async function getPlaylists(): Promise<{ data: PlaylistItem[] }> {
  const { data } = await apiClient.get("/api/playlists", {
    params: { limit: 100 },
  });
  return data;
}

export async function getPlaylist(id: string): Promise<PlaylistDetail> {
  const { data } = await apiClient.get(`/api/playlists/${id}`);
  return data;
}

export async function createPlaylist(name: string): Promise<PlaylistItem> {
  const { data } = await apiClient.post("/api/playlists", { name });
  return data;
}

export async function renamePlaylist(
  id: string,
  name: string,
): Promise<PlaylistItem> {
  const { data } = await apiClient.patch(`/api/playlists/${id}`, { name });
  return data;
}

export async function deletePlaylist(id: string): Promise<void> {
  await apiClient.delete(`/api/playlists/${id}`);
}

export async function addTrackToPlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  await apiClient.post(`/api/playlists/${playlistId}/tracks`, { trackId });
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  await apiClient.delete(`/api/playlists/${playlistId}/tracks/${trackId}`);
}

export async function reorderPlaylist(
  playlistId: string,
  trackIds: string[],
): Promise<void> {
  await apiClient.patch(`/api/playlists/${playlistId}/reorder`, { trackIds });
}

// ─── Stream token ─────────────────────────────────────────────────────────────

export async function getStreamToken(): Promise<{
  token: string;
  expiresIn: number;
}> {
  const { data } = await apiClient.post("/api/stream/token");
  return data;
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function postHistory(trackId: string): Promise<void> {
  // fire-and-forget — never block playback on this
  apiClient.post("/api/history", { trackId }).catch(() => {
    /* ignore */
  });
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchResults {
  tracks: TrackItem[];
  albums: AlbumItem[];
  artists: ArtistItem[];
}

export async function searchAll(query: string): Promise<SearchResults> {
  const [tracksRes, albumsRes, artistsRes] = await Promise.all([
    apiClient.get("/api/tracks", {
      params: { search: query, limit: 5 },
    }),
    apiClient.get("/api/albums", {
      params: { search: query, limit: 5 },
    }),
    apiClient.get("/api/artists", {
      params: { search: query, limit: 5 },
    }),
  ]);

  return {
    tracks: tracksRes.data.data ?? [],
    albums: albumsRes.data.data ?? [],
    artists: artistsRes.data.data ?? [],
  };
}

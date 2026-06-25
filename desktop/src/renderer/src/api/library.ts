import { apiClient } from "./axios";
import type { Album, Artist, PaginatedResponse, Playlist, Track } from "@mugisk/shared-types";

// ── Helper ───────────────────────────────────────────────────────────────────

interface BackendPaginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

function mapPaginatedResponse<T, R>(res: BackendPaginated<T>, mapper: (item: T) => R): PaginatedResponse<R> {
  return {
    items: res.data.map(mapper),
    total: res.meta.total,
    page: res.meta.page,
    pageSize: res.meta.pageSize,
    hasNextPage: res.meta.page < res.meta.totalPages
  };
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapTrack(t: any): Track {
  return {
    ...t,
    artist: t.artist?.name || "Unknown Artist",
    album: t.album?.title || "Unknown Album",
    duration: t.durationSeconds ?? t.duration ?? 0,
    coverArtId: t.album?.coverUrl || t.coverArtId || undefined
  };
}

function mapAlbum(a: any): Album {
  return {
    ...a,
    artist: a.artist?.name || "Unknown Artist",
    trackCount: a._count?.tracks ?? a.trackCount ?? 0,
    duration: a.duration || 0,
  };
}

// ── Albums ───────────────────────────────────────────────────────────────────

export async function getAlbums(page = 1, limit = 50, search?: string): Promise<PaginatedResponse<Album>> {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (search) params.set("search", search);
  const { data } = await apiClient.get<BackendPaginated<any>>("/api/albums", { params });
  return mapPaginatedResponse(data, mapAlbum);
}

export async function getAlbum(id: string): Promise<Album> {
  const { data } = await apiClient.get<any>(`/api/albums/${id}`);
  return mapAlbum(data);
}

export async function getAlbumTracks(id: string): Promise<Track[]> {
  const { data } = await apiClient.get<any>(`/api/albums/${id}`);
  return data.tracks.map((t: any) => mapTrack({ ...t, album: { title: data.title, coverUrl: data.coverUrl } }));
}

// ── Artists ──────────────────────────────────────────────────────────────────

export async function getArtists(page = 1, limit = 50, search?: string): Promise<PaginatedResponse<Artist>> {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (search) params.set("search", search);
  const { data } = await apiClient.get<BackendPaginated<any>>("/api/artists", { params });
  return mapPaginatedResponse(data, (a) => a); // Artist might not need mapping yet
}

export async function getArtist(id: string): Promise<Artist> {
  const { data } = await apiClient.get<any>(`/api/artists/${id}`);
  return data;
}

export async function getArtistAlbums(id: string): Promise<Album[]> {
  const { data } = await apiClient.get<any>(`/api/artists/${id}`);
  return data.albums.map(mapAlbum);
}

// ── Tracks ───────────────────────────────────────────────────────────────────

export async function getTracks(page = 1, limit = 50, search?: string, genre?: string): Promise<PaginatedResponse<Track>> {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (search) params.set("search", search);
  if (genre) params.set("genre", genre);
  const { data } = await apiClient.get<BackendPaginated<any>>("/api/tracks", { params });
  return mapPaginatedResponse(data, mapTrack);
}

// ── Genres ───────────────────────────────────────────────────────────────────

export interface GenreCount {
  genre: string;
  trackCount: number;
}

export async function getGenres(): Promise<GenreCount[]> {
  const { data } = await apiClient.get<{ data: GenreCount[] }>("/api/genres");
  return data.data;
}

// ── Playlists ────────────────────────────────────────────────────────────────

export async function getPlaylists(page = 1, limit = 50): Promise<PaginatedResponse<Playlist>> {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  const { data } = await apiClient.get<BackendPaginated<Playlist>>("/api/playlists", { params });
  return mapPaginatedResponse(data, (p) => p);
}

export async function getPlaylist(id: string): Promise<Playlist> {
  const { data } = await apiClient.get<any>(`/api/playlists/${id}`);
  return data;
}

export async function getPlaylistTracks(id: string): Promise<Track[]> {
  const { data } = await apiClient.get<any>(`/api/playlists/${id}`);
  return data.tracks.map(mapTrack);
}

export async function createPlaylist(name: string, description?: string, isPublic = false): Promise<Playlist> {
  const { data } = await apiClient.post<{ data: Playlist }>("/api/playlists", { name, description, isPublic });
  return data.data;
}

export async function updatePlaylist(id: string, updates: { name?: string; description?: string; isPublic?: boolean }): Promise<Playlist> {
  const { data } = await apiClient.patch<{ data: Playlist }>(`/api/playlists/${id}`, updates);
  return data.data;
}

export async function deletePlaylist(id: string): Promise<void> {
  await apiClient.delete(`/api/playlists/${id}`);
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  await apiClient.post(`/api/playlists/${playlistId}/tracks`, { trackId });
}

export async function removeTrackFromPlaylist(playlistId: string, playlistTrackId: string): Promise<void> {
  await apiClient.delete(`/api/playlists/${playlistId}/tracks/${playlistTrackId}`);
}

export async function reorderPlaylistTracks(playlistId: string, trackIds: string[]): Promise<void> {
  await apiClient.patch(`/api/playlists/${playlistId}/reorder`, { trackIds });
}

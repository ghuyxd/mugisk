import { apiClient } from "./axios";
import type { Track, Playlist } from "@mugisk/shared-types";


export async function generateSmartPlaylist(): Promise<Playlist> {
  const { data } = await apiClient.post<Playlist>("/api/ai/smart-playlist");
  return data;
}

export async function getExplorePlaylists(): Promise<Playlist[]> {
  const { data } = await apiClient.get<Playlist[]>("/api/ai/explore");
  return data;
}

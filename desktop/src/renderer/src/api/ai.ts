import { apiClient } from "./axios";
import type { Track, Playlist } from "@mugisk/shared-types";


export async function generateSmartPlaylist(): Promise<Playlist> {
  const { data } = await apiClient.post<Playlist>("/api/ai/smart-playlist");
  return data;
}

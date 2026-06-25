import { apiClient } from "./axios";

// ── Stream Token ─────────────────────────────────────────────────────────────

export async function getStreamToken(): Promise<{ token: string; expiresIn: number }> {
  const { data } = await apiClient.post<{ token: string; expiresIn: number }>("/api/stream/token");
  return data;
}

// ── History ──────────────────────────────────────────────────────────────────

export async function recordPlaybackHistory(trackId: string): Promise<void> {
  // Fire and forget, don't throw if it fails
  apiClient.post("/api/history", { trackId }).catch(() => {});
}

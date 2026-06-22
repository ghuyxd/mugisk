"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiJson, apiFetch } from "@/lib/adminFetch";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DropZone } from "../components/DropZone";

interface Track {
  id: string;
  title: string;
  genre: string | null;
  durationSeconds: number;
  format: string;
  artist: { id: string; name: string };
  album: { id: string; title: string } | null;
}

interface TracksResponse {
  data: Track[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface ScanLog {
  id: string;
  type: string;
  status: "SUCCESS" | "FAILED";
  filePath: string | null;
  message: string | null;
  createdAt: string;
}

interface ScanStatusResponse {
  logs: ScanLog[];
  summary: {
    lastScanTime: string | null;
    totalIndexed: number;
    totalFailed: number;
    totalDuplicates: number;
  };
}

interface UploadResult {
  filename: string;
  status: string;
  trackId?: string;
  error?: string;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LibraryPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Track | null>(null);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [scanSummary, setScanSummary] = useState<ScanStatusResponse["summary"] | null>(null);
  const scanPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanActiveRef = useRef(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  const fetchTracks = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (q) params.set("search", q);
      const data = await apiJson<TracksResponse>(`/api/tracks?${params}`);
      setTracks(data.data);
      setMeta(data.meta);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTracks(search, page);
  }, [page, fetchTracks]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => void fetchTracks(value, 1), 350);
  }

  // ── Scan polling ─────────────────────────────────────────────────────────────

  async function fetchScanStatus() {
    try {
      const data = await apiJson<ScanStatusResponse>("/api/admin/library/scan-status?limit=20");
      setScanLogs(data.logs);
      setScanSummary(data.summary);
    } catch {
      // silently ignore poll errors
    }
  }

  function startPolling() {
    scanActiveRef.current = true;
    if (scanPollRef.current) clearInterval(scanPollRef.current);
    scanPollRef.current = setInterval(() => {
      void fetchScanStatus();
    }, 3000);

    // Stop after 60 s
    setTimeout(() => stopPolling(), 60_000);
  }

  function stopPolling() {
    scanActiveRef.current = false;
    if (scanPollRef.current) {
      clearInterval(scanPollRef.current);
      scanPollRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => () => stopPolling(), []); // cleanup on unmount

  async function handleRescan() {
    setScanning(true);
    setScanLogs([]);
    setScanSummary(null);
    setError("");
    try {
      await apiFetch("/api/admin/library/rescan", { method: "POST" });
      showToast("Rescan complete. Refreshing track list…");
      await fetchScanStatus();
      await fetchTracks(search, page);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
    // Also start polling for live updates during the scan
    startPolling();
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  async function handleFiles(files: File[]) {
    setUploading(true);
    setUploadResults([]);
    const formData = new FormData();
    for (const file of files) formData.append("files", file);

    try {
      const res = await apiFetch("/api/admin/library/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { results: UploadResult[] };
      setUploadResults(data.results);
      const indexed = data.results.filter((r) => r.status === "indexed").length;
      showToast(`Uploaded ${indexed} file(s). Refreshing…`);
      await fetchTracks(search, page);
      // Start polling scan status to show the new files
      startPolling();
      void fetchScanStatus();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  // ── Inline edit ──────────────────────────────────────────────────────────────

  function startEdit(track: Track) {
    setEditingId(track.id);
    setEditTitle(track.title);
    setEditGenre(track.genre ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(trackId: string) {
    setSavingId(trackId);
    try {
      await apiFetch(`/api/admin/tracks/${trackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim() || undefined,
          genre: editGenre.trim() || null,
        }),
      });
      setEditingId(null);
      showToast("Track updated.");
      await fetchTracks(search, page);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function deleteTrack(trackId: string) {
    try {
      const res = await apiFetch(`/api/admin/tracks/${trackId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Delete failed");
      }
      showToast("Track deleted.");
      await fetchTracks(search, page);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Library</h1>
        <p className="page-subtitle">{meta.total} track{meta.total !== 1 ? "s" : ""} in library</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {toast && <div className="alert alert--success">{toast}</div>}

      {/* Upload zone */}
      <div style={{ marginBottom: "1.5rem" }}>
        <DropZone onFiles={(files) => void handleFiles(files)} disabled={uploading} />
        {uploadResults.length > 0 && (
          <div style={{ marginTop: "0.75rem" }}>
            {uploadResults.map((r) => (
              <div
                key={r.filename}
                className={`alert ${r.status === "indexed" ? "alert--success" : "alert--error"}`}
                style={{ marginBottom: "0.4rem" }}
              >
                <strong>{r.filename}</strong>: {r.status}
                {r.error && ` — ${r.error}`}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Track table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-search">
            <span className="table-search-icon">🔍</span>
            <input
              id="library-search-input"
              type="text"
              className="table-search-input"
              placeholder="Search tracks or artists…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              id="rescan-btn"
              className="btn btn--ghost"
              onClick={() => void handleRescan()}
              disabled={scanning}
            >
              {scanning ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14 }} /> Scanning…
                </>
              ) : (
                "↺ Rescan Library"
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-center">
            <span className="spinner" />
            Loading tracks…
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" id="library-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>Album</th>
                    <th>Genre</th>
                    <th>Duration</th>
                    <th>Format</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "var(--color-muted-light)" }}>
                        No tracks found
                      </td>
                    </tr>
                  ) : (
                    tracks.map((track) =>
                      editingId === track.id ? (
                        <tr key={track.id}>
                          <td>
                            <input
                              id={`edit-title-${track.id}`}
                              className="inline-input"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveEdit(track.id);
                                if (e.key === "Escape") cancelEdit();
                              }}
                              autoFocus
                            />
                          </td>
                          <td className="text-muted">{track.artist.name}</td>
                          <td className="text-muted">{track.album?.title ?? "—"}</td>
                          <td>
                            <input
                              id={`edit-genre-${track.id}`}
                              className="inline-input"
                              value={editGenre}
                              onChange={(e) => setEditGenre(e.target.value)}
                              placeholder="Genre"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveEdit(track.id);
                                if (e.key === "Escape") cancelEdit();
                              }}
                            />
                          </td>
                          <td className="text-muted">{formatDuration(track.durationSeconds)}</td>
                          <td className="text-muted">{track.format.toUpperCase()}</td>
                          <td>
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <button
                                id={`save-edit-${track.id}`}
                                className="btn btn--primary btn--sm"
                                disabled={savingId === track.id}
                                onClick={() => void saveEdit(track.id)}
                              >
                                {savingId === track.id ? "Saving…" : "Save"}
                              </button>
                              <button
                                id={`cancel-edit-${track.id}`}
                                className="btn btn--ghost btn--sm"
                                onClick={cancelEdit}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={track.id}>
                          <td>
                            <span style={{ color: "var(--color-text)", fontWeight: 500 }}>
                              {track.title}
                            </span>
                          </td>
                          <td className="text-muted">{track.artist.name}</td>
                          <td className="text-muted">{track.album?.title ?? "—"}</td>
                          <td className="text-muted">{track.genre ?? "—"}</td>
                          <td className="text-muted">{formatDuration(track.durationSeconds)}</td>
                          <td className="text-muted">{track.format.toUpperCase()}</td>
                          <td>
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <button
                                id={`edit-track-${track.id}`}
                                className="btn btn--ghost btn--sm"
                                onClick={() => startEdit(track)}
                              >
                                Edit
                              </button>
                              <button
                                id={`delete-track-${track.id}`}
                                className="btn btn--danger-ghost btn--sm"
                                onClick={() => setDeleteTarget(track)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="pagination">
                <span>
                  Page {meta.page} of {meta.totalPages} · {meta.total} total
                </span>
                <div className="pagination-buttons">
                  <button
                    id="library-prev-btn"
                    className="btn btn--ghost btn--sm"
                    disabled={meta.page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Prev
                  </button>
                  <button
                    id="library-next-btn"
                    className="btn btn--ghost btn--sm"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Scan status panel */}
      {(scanning || scanLogs.length > 0) && (
        <div className="scan-panel">
          <div className="scan-panel-header">
            <div className="scan-panel-title">
              {scanning && <div className="pulse-dot" />}
              Scan Status
              {scanSummary && (
                <span style={{ fontWeight: 400, color: "var(--color-muted-light)", fontSize: "0.8rem" }}>
                  · {scanSummary.totalIndexed} indexed · {scanSummary.totalFailed} failed ·{" "}
                  {scanSummary.totalDuplicates} duplicates
                </span>
              )}
            </div>
            {!scanning && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => { setScanLogs([]); setScanSummary(null); }}
              >
                Clear
              </button>
            )}
          </div>
          <div className="scan-log-list">
            {scanLogs.map((log) => (
              <div className="scan-log-item" key={log.id}>
                <span className={`scan-log-status scan-log-status--${log.status}`}>
                  {log.status}
                </span>
                <span className="scan-log-path">
                  {log.message ?? log.filePath ?? log.type}
                </span>
              </div>
            ))}
            {scanLogs.length === 0 && scanning && (
              <div style={{ padding: "1rem 1.25rem", color: "var(--color-muted-light)", fontSize: "0.82rem" }}>
                Scan in progress…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete track?"
        message={`This will permanently remove "${deleteTarget?.title}" from the database. The file on disk will NOT be deleted.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteTarget && void deleteTrack(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

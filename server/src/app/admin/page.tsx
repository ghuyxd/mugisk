"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/adminFetch";
import { StatCard } from "./components/StatCard";

interface Stats {
  totalUsers: number;
  totalTracks: number;
  totalAlbums: number;
  storageBytes: number;
  recentUploads: number;
}

interface ScanLogEntry {
  id: string;
  type: string;
  status: "SUCCESS" | "FAILED";
  filePath: string | null;
  message: string | null;
  createdAt: string;
}

interface ScanStatusResponse {
  logs: ScanLogEntry[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<ScanLogEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiJson<Stats>("/api/admin/stats"),
      apiJson<ScanStatusResponse>("/api/admin/library/scan-status?limit=10"),
    ])
      .then(([s, scanData]) => {
        setStats(s);
        setLogs(scanData.logs);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your Mugisk server</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {/* Stat cards */}
      <div className="stat-grid">
        <StatCard
          icon="👤"
          title="Total Users"
          value={stats?.totalUsers ?? "—"}
        />
        <StatCard
          icon="🎵"
          title="Total Tracks"
          value={stats?.totalTracks ?? "—"}
        />
        <StatCard
          icon="💿"
          title="Total Albums"
          value={stats?.totalAlbums ?? "—"}
        />
        <StatCard
          icon="💾"
          title="Storage Used"
          value={stats ? formatBytes(stats.storageBytes) : "—"}
        />
        <StatCard
          icon="🆕"
          title="Recent Uploads"
          value={stats?.recentUploads ?? "—"}
          subtitle="last 24 hours"
          accent={Boolean(stats && stats.recentUploads > 0)}
        />
      </div>

      {/* Activity feed */}
      <div className="activity-feed">
        <div className="activity-feed-header">Recent Scan Activity</div>
        {logs.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--color-muted-light)",
              fontSize: "0.875rem",
            }}
          >
            {stats === null ? "Loading…" : "No scan activity yet."}
          </div>
        ) : (
          logs.map((log) => (
            <div className="activity-item" key={log.id}>
              <div
                className={`activity-dot activity-dot--${log.status === "SUCCESS" ? "success" : "failed"}`}
              />
              <div className="activity-message">
                {log.message ?? log.filePath ?? log.type}
              </div>
              <div className="activity-time">{timeAgo(log.createdAt)}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

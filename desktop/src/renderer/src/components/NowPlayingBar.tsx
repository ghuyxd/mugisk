/**
 * NowPlayingBar — integrates with PlayerContext.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Heart,
  Music,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";

import { usePlayer } from "@renderer/context/PlayerContext";

function formatDuration(s: number): string {
  if (isNaN(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function NowPlayingBar(): React.JSX.Element {
  const {
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();

  const currentTrack = queue[currentIndex];

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    seek(pos * duration);
  };

  const handleVolume = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(pos);
  };

  const seekPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volPercent = volume * 100;

  return (
    <div className="now-playing-bar" role="region" aria-label="Now Playing">
      {/* ── Left: Track Info ──────────────────────────────────────────── */}
      <div className="bar-track">
        <div className="bar-cover" aria-label="Album art">
          {currentTrack?.coverUrl ? (
            <img src={currentTrack.coverUrl} alt="Cover" />
          ) : (
            <Music size={20} />
          )}
        </div>
        <div className="bar-info">
          <div className="bar-title">
            {currentTrack?.title ?? "Nothing playing"}
          </div>
          <div className="bar-artist">{currentTrack?.artistName ?? "—"}</div>
        </div>
        <button className="bar-heart" aria-label="Like track">
          <Heart size={14} />
        </button>
      </div>

      {/* ── Center: Transport ─────────────────────────────────────────── */}
      <div className="bar-transport">
        <div className="bar-controls">
          <button
            className={`bar-btn ${shuffle ? "active" : ""}`}
            onClick={toggleShuffle}
            aria-label="Shuffle"
            style={{ color: shuffle ? "var(--brand)" : undefined }}
          >
            <Shuffle size={15} />
          </button>
          <button className="bar-btn" onClick={prev} aria-label="Previous">
            <SkipBack size={18} />
          </button>
          <button
            className="bar-btn play"
            onClick={togglePlay}
            aria-label="Play / Pause"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className="bar-btn" onClick={next} aria-label="Next">
            <SkipForward size={18} />
          </button>
          <button
            className={`bar-btn ${repeat !== "off" ? "active" : ""}`}
            onClick={cycleRepeat}
            aria-label="Repeat"
            style={{ color: repeat !== "off" ? "var(--brand)" : undefined }}
          >
            <Repeat size={15} />
            {repeat === "one" && (
              <span style={{ fontSize: "10px", position: "absolute", marginTop: "12px", marginLeft: "14px", fontWeight: "bold" }}>
                1
              </span>
            )}
          </button>
        </div>

        {/* Seek bar */}
        <div className="bar-seek">
          <span className="bar-time">{formatDuration(currentTime)}</span>
          <div
            className="seek-track"
            role="slider"
            aria-label="Seek"
            aria-valuenow={seekPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            onClick={handleSeek}
            style={{ cursor: "pointer" }}
          >
            <div className="seek-fill" style={{ width: `${seekPercent}%` }} />
          </div>
          <span className="bar-time">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* ── Right: Volume ─────────────────────────────────────────────── */}
      <div className="bar-right">
        <button
          className="bar-btn"
          aria-label="Volume"
          onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
        >
          <Volume2 size={15} />
        </button>
        <div
          className="volume-track"
          role="slider"
          aria-label="Volume"
          aria-valuenow={volPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          onClick={handleVolume}
          style={{ cursor: "pointer" }}
        >
          <div className="volume-fill" style={{ width: `${volPercent}%` }} />
        </div>
      </div>
    </div>
  );
}

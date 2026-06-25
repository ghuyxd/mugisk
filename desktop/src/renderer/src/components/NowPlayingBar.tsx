import React, { useState } from "react";
import {
  Heart,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { getServerUrlSync } from "../api/axios";
import QueuePanel from "./QueuePanel";

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NowPlayingBar(): React.JSX.Element {
  const player = usePlayer();
  const [showQueue, setShowQueue] = useState(false);

  const duration = player.currentTrack?.duration || 0;
  const currentTime = player.progress * duration;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - bounds.left) / bounds.width;
    player.seek(percent);
  };

  const handleVolume = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - bounds.left) / bounds.width;
    player.setVolume(percent);
  };

  const handleToggleVolume = () => {
    if (player.volume === 0) player.setVolume(1);
    else player.setVolume(0);
  };

  return (
    <>
      <div className="now-playing-bar" role="region" aria-label="Now Playing">
        {/* ── Left: Track Info ──────────────────────────────────────────── */}
        <div className="bar-track">
          <div className="bar-cover" aria-label="Album art">
            {player.currentTrack?.coverArtId ? (
              <img
                src={`${getServerUrlSync()}${player.currentTrack.coverArtId}`}
                alt="cover"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <Music size={20} />
            )}
          </div>
          <div className="bar-info">
            <div className="bar-title" title={player.currentTrack?.title || "Nothing playing"}>
              {player.currentTrack?.title || "Nothing playing"}
            </div>
            <div className="bar-artist" title={player.currentTrack?.artist || "—"}>
              {player.currentTrack?.artist || "—"}
            </div>
          </div>
          <button className="bar-heart" aria-label="Like track">
            <Heart size={14} />
          </button>
        </div>

        {/* ── Center: Transport ─────────────────────────────────────────── */}
        <div className="bar-transport">
          <div className="bar-controls">
            <button 
              className={`bar-btn ${player.shuffle ? 'active' : ''}`} 
              aria-label="Shuffle"
              onClick={player.toggleShuffle}
              style={{ color: player.shuffle ? "var(--primary)" : undefined }}
            >
              <Shuffle size={15} />
            </button>
            <button className="bar-btn" aria-label="Previous" onClick={player.playPrev}>
              <SkipBack size={18} />
            </button>
            <button className="bar-btn play" aria-label="Play / Pause" onClick={player.togglePlay}>
              {player.isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="bar-btn" aria-label="Next" onClick={player.playNext}>
              <SkipForward size={18} />
            </button>
            <button 
              className={`bar-btn ${player.repeat !== 'none' ? 'active' : ''}`} 
              aria-label="Repeat"
              onClick={player.toggleRepeat}
              style={{ color: player.repeat !== "none" ? "var(--primary)" : undefined }}
            >
              {player.repeat === "one" ? <Repeat1 size={15} /> : <Repeat size={15} />}
            </button>
          </div>

          {/* Seek bar */}
          <div className="bar-seek">
            <span className="bar-time">{formatTime(currentTime)}</span>
            <div 
              className="seek-track" 
              role="slider" 
              aria-label="Seek" 
              aria-valuenow={player.progress * 100} 
              aria-valuemin={0} 
              aria-valuemax={100}
              onClick={handleSeek}
              style={{ cursor: 'pointer' }}
            >
              <div className="seek-fill" style={{ width: `${player.progress * 100}%` }} />
            </div>
            <span className="bar-time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* ── Right: Volume & Queue ─────────────────────────────────────── */}
        <div className="bar-right">
          <button 
            className="bar-btn" 
            aria-label="Queue"
            onClick={() => setShowQueue(v => !v)}
            style={{ color: showQueue ? "var(--primary)" : undefined, marginRight: 8 }}
          >
            <ListMusic size={15} />
          </button>

          <button className="bar-btn" aria-label="Volume" onClick={handleToggleVolume}>
            {player.volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <div 
            className="volume-track" 
            role="slider" 
            aria-label="Volume" 
            aria-valuenow={player.volume * 100} 
            aria-valuemin={0} 
            aria-valuemax={100}
            onClick={handleVolume}
            style={{ cursor: 'pointer' }}
          >
            <div className="volume-fill" style={{ width: `${player.volume * 100}%` }} />
          </div>
        </div>
      </div>

      {showQueue && (
        <QueuePanel onClose={() => setShowQueue(false)} />
      )}
    </>
  );
}

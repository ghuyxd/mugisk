/**
 * NowPlayingBar — visual layout only.
 * No real playback logic — that comes in Phase 7.
 */

import React from "react";
import {
  Heart,
  Music,
  Pause,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";

export default function NowPlayingBar(): React.JSX.Element {
  return (
    <div className="now-playing-bar" role="region" aria-label="Now Playing">
      {/* ── Left: Track Info ──────────────────────────────────────────── */}
      <div className="bar-track">
        <div className="bar-cover" aria-label="Album art">
          <Music size={20} />
        </div>
        <div className="bar-info">
          <div className="bar-title">Nothing playing</div>
          <div className="bar-artist">—</div>
        </div>
        <button className="bar-heart" aria-label="Like track">
          <Heart size={14} />
        </button>
      </div>

      {/* ── Center: Transport ─────────────────────────────────────────── */}
      <div className="bar-transport">
        <div className="bar-controls">
          <button className="bar-btn" aria-label="Shuffle">
            <Shuffle size={15} />
          </button>
          <button className="bar-btn" aria-label="Previous">
            <SkipBack size={18} />
          </button>
          <button className="bar-btn play" aria-label="Play / Pause">
            <Pause size={16} />
          </button>
          <button className="bar-btn" aria-label="Next">
            <SkipForward size={18} />
          </button>
          <button className="bar-btn" aria-label="Repeat">
            <Repeat size={15} />
          </button>
        </div>

        {/* Seek bar */}
        <div className="bar-seek">
          <span className="bar-time">0:00</span>
          <div className="seek-track" role="slider" aria-label="Seek" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100}>
            <div className="seek-fill" />
          </div>
          <span className="bar-time">0:00</span>
        </div>
      </div>

      {/* ── Right: Volume ─────────────────────────────────────────────── */}
      <div className="bar-right">
        <button className="bar-btn" aria-label="Volume">
          <Volume2 size={15} />
        </button>
        <div className="volume-track" role="slider" aria-label="Volume" aria-valuenow={70} aria-valuemin={0} aria-valuemax={100}>
          <div className="volume-fill" />
        </div>
      </div>
    </div>
  );
}

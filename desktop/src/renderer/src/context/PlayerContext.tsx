/**
 * PlayerContext — global audio playback engine.
 *
 * Uses a single HTMLAudioElement (singleton ref) wired to the server stream
 * endpoint.  Stream auth uses a short-lived token (?token=…) fetched via
 * POST /api/stream/token and cached for ~4 minutes.
 *
 * Queue entries are lightweight snapshots so the UI never needs extra fetches.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { getStreamToken, postHistory } from "@renderer/api/library";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueueTrack {
  id: string;
  title: string;
  artistName: string;
  albumTitle: string;
  coverUrl: string | null;
  durationSeconds: number;
}

export type RepeatMode = "off" | "one" | "all";

interface PlayerState {
  queue: QueueTrack[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  queueOpen: boolean;
}

interface PlayerActions {
  playTrack: (track: QueueTrack) => void;
  playAll: (tracks: QueueTrack[], startIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: QueueTrack) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (newQueue: QueueTrack[]) => void;
  toggleQueuePanel: () => void;
}

type PlayerContextValue = PlayerState & PlayerActions;

// ─── Context ──────────────────────────────────────────────────────────────────

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ─── Stream token cache ───────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number; // ms
}

let tokenCache: TokenCache | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  // Re-use if still valid for >30 s
  if (tokenCache && tokenCache.expiresAt - now > 30_000) {
    return tokenCache.token;
  }
  const res = await getStreamToken();
  tokenCache = {
    token: res.token,
    expiresAt: now + res.expiresIn * 1000,
  };
  return res.token;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlayerProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shuffleOrderRef = useRef<number[]>([]);

  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [queueOpen, setQueueOpen] = useState(false);

  // Build / rebuild shuffle order whenever queue changes
  useEffect(() => {
    const indices = Array.from({ length: queue.length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    shuffleOrderRef.current = indices;
  }, [queue.length]);

  // ── Audio element setup ─────────────────────────────────────────────────────

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = 0.8;
    audioRef.current = audio;

    const onTimeUpdate = (): void => setCurrentTime(audio.currentTime);
    const onDurationChange = (): void => setDuration(audio.duration || 0);
    const onEnded = (): void => {
      handleEnd();
    };
    const onPlay = (): void => setIsPlaying(true);
    const onPause = (): void => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load & play a queue index ───────────────────────────────────────────────

  const loadAndPlay = useCallback(
    async (idx: number, tracks: QueueTrack[]) => {
      const audio = audioRef.current;
      if (!audio || idx < 0 || idx >= tracks.length) return;

      const track = tracks[idx];
      try {
        const token = await getToken();
        const serverUrl = (await window.api.store.get("serverUrl")) as string;
        const base = serverUrl.replace(/\/$/, "");
        audio.src = `${base}/api/stream/${track.id}?token=${token}`;
        audio.currentTime = 0;
        await audio.play();
        setCurrentIndex(idx);
        // Fire history (non-blocking)
        postHistory(track.id);
      } catch (err) {
        console.error("[Player] Failed to load track", err);
      }
    },
    [],
  );

  // ── Handle ended ───────────────────────────────────────────────────────────

  const handleEnd = useCallback(() => {
    setCurrentIndex((idx) => {
      setQueue((q) => {
        // We need both values here — capture via closure
        const repeatMode = repeat;
        if (repeatMode === "one") {
          audioRef.current?.play().catch(() => {});
          return q;
        }
        // Determine next index
        let nextIdx: number;
        if (shuffle && shuffleOrderRef.current.length > 0) {
          const pos = shuffleOrderRef.current.indexOf(idx);
          const nextPos = (pos + 1) % shuffleOrderRef.current.length;
          nextIdx = shuffleOrderRef.current[nextPos];
        } else {
          nextIdx = idx + 1;
        }

        if (nextIdx < q.length) {
          void loadAndPlay(nextIdx, q);
          return q;
        } else if (repeatMode === "all" && q.length > 0) {
          void loadAndPlay(0, q);
          return q;
        } else {
          setIsPlaying(false);
          return q;
        }
      });
      return idx; // unchanged — actual index update happens inside loadAndPlay
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeat, shuffle, loadAndPlay]);

  // Keep ended handler in sync without recreating audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = (): void => handleEnd();
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [handleEnd]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const editable =
        tag === "input" || tag === "textarea" || tag === "select";

      if (e.code === "Space" && !editable) {
        e.preventDefault();
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
      }
      if (e.code === "MediaPlayPause") {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
      }
      if (e.code === "MediaTrackNext") {
        // handled below via next()
        setCurrentIndex((idx) => {
          setQueue((q) => {
            const nextIdx = idx + 1 < q.length ? idx + 1 : idx;
            void loadAndPlay(nextIdx, q);
            return q;
          });
          return idx;
        });
      }
      if (e.code === "MediaTrackPrevious") {
        setCurrentIndex((idx) => {
          const audio2 = audioRef.current;
          if (audio2 && audio2.currentTime > 3) {
            audio2.currentTime = 0;
            return idx;
          }
          setQueue((q) => {
            const prevIdx = idx - 1 >= 0 ? idx - 1 : idx;
            void loadAndPlay(prevIdx, q);
            return q;
          });
          return idx;
        });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [loadAndPlay]);

  // ── Public actions ─────────────────────────────────────────────────────────

  const playTrack = useCallback(
    (track: QueueTrack) => {
      setQueue((q) => {
        // If already in queue, just jump to it
        const existing = q.findIndex((t) => t.id === track.id);
        if (existing !== -1) {
          void loadAndPlay(existing, q);
          return q;
        }
        // Append and play
        const newQueue = [...q, track];
        void loadAndPlay(newQueue.length - 1, newQueue);
        return newQueue;
      });
    },
    [loadAndPlay],
  );

  const playAll = useCallback(
    (tracks: QueueTrack[], startIndex = 0) => {
      setQueue(tracks);
      void loadAndPlay(startIndex, tracks);
    },
    [loadAndPlay],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    if (audioRef.current) audioRef.current.volume = clamped;
    setVolumeState(clamped);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((idx) => {
      setQueue((q) => {
        let nextIdx: number;
        if (shuffle && shuffleOrderRef.current.length > 0) {
          const pos = shuffleOrderRef.current.indexOf(idx);
          nextIdx = shuffleOrderRef.current[(pos + 1) % shuffleOrderRef.current.length];
        } else {
          nextIdx = (idx + 1) % q.length;
        }
        void loadAndPlay(nextIdx, q);
        return q;
      });
      return idx;
    });
  }, [shuffle, loadAndPlay]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    // If >3s in, restart current track
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setCurrentIndex((idx) => {
      setQueue((q) => {
        let prevIdx: number;
        if (shuffle && shuffleOrderRef.current.length > 0) {
          const pos = shuffleOrderRef.current.indexOf(idx);
          prevIdx =
            shuffleOrderRef.current[
              (pos - 1 + shuffleOrderRef.current.length) %
                shuffleOrderRef.current.length
            ];
        } else {
          prevIdx = (idx - 1 + q.length) % q.length;
        }
        void loadAndPlay(prevIdx, q);
        return q;
      });
      return idx;
    });
  }, [shuffle, loadAndPlay]);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => {
      if (r === "off") return "all";
      if (r === "all") return "one";
      return "off";
    });
  }, []);

  const addToQueue = useCallback((track: QueueTrack) => {
    setQueue((q) => [...q, track]);
  }, []);

  const removeFromQueue = useCallback(
    (index: number) => {
      setQueue((q) => {
        const newQ = q.filter((_, i) => i !== index);
        // If removed track was before current, shift index
        setCurrentIndex((ci) => {
          if (index < ci) return ci - 1;
          if (index === ci) {
            // Stop if queue becomes empty, else play next
            if (newQ.length === 0) {
              audioRef.current?.pause();
              return -1;
            }
            const nextIdx = Math.min(ci, newQ.length - 1);
            void loadAndPlay(nextIdx, newQ);
          }
          return ci;
        });
        return newQ;
      });
    },
    [loadAndPlay],
  );

  const reorderQueue = useCallback(
    (newQueue: QueueTrack[]) => {
      // Find where currentIndex track ended up
      const currentTrackId = queue[currentIndex]?.id;
      setQueue(newQueue);
      if (currentTrackId) {
        const newIdx = newQueue.findIndex((t) => t.id === currentTrackId);
        if (newIdx !== -1) setCurrentIndex(newIdx);
      }
    },
    [queue, currentIndex],
  );

  const toggleQueuePanel = useCallback(() => setQueueOpen((o) => !o), []);

  const value: PlayerContextValue = {
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    queueOpen,
    playTrack,
    playAll,
    pause,
    resume,
    togglePlay,
    seek,
    setVolume,
    next,
    prev,
    toggleShuffle,
    cycleRepeat,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    toggleQueuePanel,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

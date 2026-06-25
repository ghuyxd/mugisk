import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Track, RepeatMode } from "@mugisk/shared-types";
import { getStreamToken, recordPlaybackHistory } from "../api/player";

interface PlayerContextValue {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  progress: number; // 0 to 1
  volume: number; // 0 to 1
  repeat: RepeatMode;
  shuffle: boolean;

  playTrack: (track: Track, newQueue?: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  setVolume: (v: number) => void;
  seek: (percent: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (newQueue: Track[], newIndex: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function PlayerProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [originalQueue, setOriginalQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [repeat, setRepeat] = useState<RepeatMode>("none");
  const [shuffle, setShuffle] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    const handleEnded = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        playNext();
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
      audio.src = "";
    };
  }, []); // Note: playNext is captured, but we use a ref to avoid stale closures below

  // Refs for current state to use in event listeners
  const stateRef = useRef({ queue, queueIndex, repeat, shuffle });
  useEffect(() => {
    stateRef.current = { queue, queueIndex, repeat, shuffle };
  }, [queue, queueIndex, repeat, shuffle]);

  const playNext = useCallback(() => {
    const { queue, queueIndex, repeat } = stateRef.current;
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeat === "all") {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.pause();
        return;
      }
    }
    playTrack(queue[nextIndex], undefined, nextIndex);
  }, []);

  const playPrev = useCallback(() => {
    const { queue, queueIndex } = stateRef.current;
    if (queue.length === 0) return;
    
    // If we've played for more than 3 seconds, restart the current track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1; // loop to back if they press prev at the start
    }
    playTrack(queue[prevIndex], undefined, prevIndex);
  }, []);

  const playTrack = useCallback(async (track: Track, newQueue?: Track[], startIndex?: number) => {
    setCurrentTrack(track);
    
    if (newQueue) {
      if (shuffle) {
        setOriginalQueue(newQueue);
        const shuffled = shuffleArray(newQueue);
        // Ensure the current track is at the start of the shuffled queue
        const currentInShuffled = shuffled.findIndex(t => t.id === track.id);
        if (currentInShuffled !== -1) {
          shuffled.splice(currentInShuffled, 1);
        }
        shuffled.unshift(track);
        setQueue(shuffled);
        setQueueIndex(0);
      } else {
        setQueue(newQueue);
        setOriginalQueue(newQueue);
        setQueueIndex(startIndex ?? newQueue.findIndex((t) => t.id === track.id));
      }
    } else if (startIndex !== undefined) {
      setQueueIndex(startIndex);
    }

    try {
      const stored = await window.api.store.get("serverUrl");
      const serverUrl = (stored as string) || import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
      const { token } = await getStreamToken();
      
      if (audioRef.current) {
        const baseUrl = serverUrl.replace(/\/$/, "");
        audioRef.current.src = `${baseUrl}/api/stream/${track.id}?token=${token}`;
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }

      // Record history
      recordPlaybackHistory(track.id);

      // Update MediaSession
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album,
          artwork: track.coverArtId 
            ? [{ src: `${serverUrl.replace(/\/$/, "")}${track.coverArtId}` }] 
            : []
        });
      }
    } catch (err) {
      console.error("Failed to play track", err);
    }
  }, [shuffle]);

  // Hook up MediaSession actions
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", togglePlay);
      navigator.mediaSession.setActionHandler("pause", togglePlay);
      navigator.mediaSession.setActionHandler("previoustrack", playPrev);
      navigator.mediaSession.setActionHandler("nexttrack", playNext);
    }
  }, [playNext, playPrev]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowRight" && e.ctrlKey) { // Just an example, Media keys are usually handled by mediaSession
         playNext();
      } else if (e.code === "ArrowLeft" && e.ctrlKey) {
         playPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(console.error);
    } else {
      audioRef.current.pause();
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const seek = useCallback((percent: number) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const clamped = Math.max(0, Math.min(1, percent));
    audioRef.current.currentTime = clamped * audioRef.current.duration;
    setProgress(clamped);
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
    setOriginalQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    // Updating originalQueue properly when shuffle is on requires finding the track. 
    // We'll just keep it simple for now or rebuild originalQueue if needed.
    if (queueIndex === index) {
      // If we remove the currently playing track, play the next one
      playNext();
    } else if (index < queueIndex) {
      setQueueIndex((prev) => prev - 1);
    }
  }, [queueIndex, playNext]);

  const reorderQueue = useCallback((newQueue: Track[], newIndex: number) => {
    setQueue(newQueue);
    setQueueIndex(newIndex);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      const willShuffle = !prev;
      if (willShuffle) {
        setOriginalQueue(queue);
        if (currentTrack) {
          const shuffled = shuffleArray(queue);
          const currentInShuffled = shuffled.findIndex(t => t.id === currentTrack.id);
          if (currentInShuffled !== -1) {
            shuffled.splice(currentInShuffled, 1);
          }
          shuffled.unshift(currentTrack);
          setQueue(shuffled);
          setQueueIndex(0);
        } else {
          setQueue(shuffleArray(queue));
        }
      } else {
        // Restore original queue
        setQueue(originalQueue);
        if (currentTrack) {
          const newIdx = originalQueue.findIndex(t => t.id === currentTrack.id);
          setQueueIndex(Math.max(0, newIdx));
        }
      }
      return willShuffle;
    });
  }, [queue, currentTrack, originalQueue]);

  const toggleRepeat = useCallback(() => {
    setRepeat((prev) => {
      if (prev === "none") return "all";
      if (prev === "all") return "one";
      return "none";
    });
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        queue,
        queueIndex,
        isPlaying,
        progress,
        volume,
        repeat,
        shuffle,
        playTrack,
        togglePlay,
        playNext,
        playPrev,
        setVolume,
        seek,
        addToQueue,
        removeFromQueue,
        reorderQueue,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}

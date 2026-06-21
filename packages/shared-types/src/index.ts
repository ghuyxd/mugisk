// ─────────────────────────────────────────────────────────────────────────────
// Auth & Users
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "USER" | "GUEST";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string; // ISO 8601
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Music Library
// ─────────────────────────────────────────────────────────────────────────────

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
  duration: number; // seconds
  bitrate?: number;
  sampleRate?: number;
  codec?: string;
  filePath: string;
  coverArtId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year?: number;
  coverArtId?: string;
  trackCount: number;
  duration: number; // total seconds
  createdAt: string;
  updatedAt: string;
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  trackCount: number;
  coverArtId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  trackCount: number;
  duration: number;
  isPublic: boolean;
  coverArtId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Playback
// ─────────────────────────────────────────────────────────────────────────────

export type RepeatMode = "none" | "one" | "all";

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  progress: number; // 0–1
  volume: number; // 0–1
  repeat: RepeatMode;
  shuffle: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Responses (generic wrappers)
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Library Scan
// ─────────────────────────────────────────────────────────────────────────────

export type ScanStatus = "idle" | "scanning" | "indexing" | "done" | "error";

export interface LibraryScanProgress {
  status: ScanStatus;
  scannedFiles: number;
  totalFiles: number;
  currentFile?: string;
  errors: string[];
  startedAt?: string;
  completedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Info
// ─────────────────────────────────────────────────────────────────────────────

export interface ServerInfo {
  name: string;
  version: string;
  musicLibraryPath: string;
  trackCount: number;
  albumCount: number;
  artistCount: number;
}

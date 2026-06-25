/**
 * Axios instance for all Mugisk API calls.
 *
 * - Reads serverUrl from electron-store via IPC on every request
 * - Attaches Authorization header from stored access token
 * - On 401, attempts a token refresh then retries the original request
 */

import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

// Tracks whether a refresh is in flight so we don't loop
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

export function getServerUrlSync(): string {
  const stored = window.api?.store?.getSync?.("serverUrl") as string;
  const url = stored || import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

// Create a bare instance — baseURL is set per-request via interceptor
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || "http://localhost:3000",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: inject baseURL + Authorization ─────────────────────

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Grab serverUrl from electron-store
  const serverUrl = (await window.api.store.get("serverUrl")) as string;
  const finalUrl = serverUrl || import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  if (!config.baseURL || serverUrl) {
    config.baseURL = finalUrl.replace(/\/$/, "");
  }

  // Attach access token
  const tokens = await window.api.token.get();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  return config;
});

// ── Response interceptor: handle 401 → refresh → retry ──────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Queue this request until the in-flight refresh completes
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;

    try {
      const tokens = await window.api.token.get();
      if (!tokens?.refreshToken) {
        throw new Error("No refresh token stored");
      }

      const serverUrl = (await window.api.store.get("serverUrl")) as string;
      const finalUrl = serverUrl || import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
      const baseUrl = finalUrl.replace(/\/$/, "");

      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
      }>(`${baseUrl}/api/auth/refresh`, {
        refreshToken: tokens.refreshToken,
      });

      await window.api.token.set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      processQueue(null, data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Clear tokens so the app redirects to login
      await window.api.token.clear();
      // Dispatch a custom event so AuthContext can react
      window.dispatchEvent(new CustomEvent("auth:logout"));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;

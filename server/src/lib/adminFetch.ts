/**
 * src/lib/adminFetch.ts
 *
 * Client-side fetch wrapper for the admin panel.
 * - Reads accessToken from localStorage
 * - Attaches Authorization: Bearer <token>
 * - On 401/403, clears credentials and redirects to /admin/login
 */

const TOKEN_KEY = "mugisk_access_token";
const REFRESH_KEY = "mugisk_refresh_token";

/** Persist tokens into localStorage + cookie (for edge middleware) */
export function saveTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  // Also set a cookie so the Next.js middleware can detect the session
  document.cookie = `mugisk_token=${accessToken}; path=/; SameSite=Lax`;
}

/** Clear stored tokens and cookie, then redirect to login */
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  document.cookie = "mugisk_token=; path=/; max-age=0";
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

/**
 * Attempt a silent token refresh using the stored refresh token.
 * Returns the new access token on success, or null on failure.
 */
async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

/**
 * Main fetch wrapper for admin API calls.
 *
 * - Adds Authorization: Bearer <token> header
 * - On 401: attempts a silent refresh and retries once
 * - On 401/403 after retry: redirects to /admin/login
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  let token = getAccessToken();

  const makeRequest = (t: string | null): Promise<Response> => {
    const headers = new Headers(options.headers);
    if (t) headers.set("Authorization", `Bearer ${t}`);
    return fetch(path, { ...options, headers });
  };

  let res = await makeRequest(token);

  // Try to silently refresh on 401
  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      token = newToken;
      res = await makeRequest(token);
    }
  }

  // If still unauthorized/forbidden, redirect to login
  if (res.status === 401 || res.status === 403) {
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = `/admin/login?from=${encodeURIComponent(window.location.pathname)}`;
    }
    // Return the response so callers can handle it (though navigation will happen)
    return res;
  }

  return res;
}

/**
 * Convenience: fetch + parse JSON. Throws an Error with the API error message
 * on non-2xx responses (except auth redirects, which navigate away).
 */
export async function apiJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await apiFetch(path, options);

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

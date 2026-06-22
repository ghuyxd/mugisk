import axios from "axios";

export interface LoginPayload {
  serverUrl: string;
  identifier: string; // email address or username
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Log in to the Mugisk server.
 * Stores tokens and serverUrl on success.
 */
export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const base = payload.serverUrl.replace(/\/$/, "");

  const { data } = await axios.post<AuthTokens>(`${base}/api/auth/login`, {
    identifier: payload.identifier, // API accepts email OR username
    password: payload.password,
  });

  // Persist serverUrl + tokens via IPC
  await window.api.store.set("serverUrl", base);
  await window.api.token.set({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return data;
}


/**
 * Log out: clear tokens from OS keychain.
 */
export async function logout(): Promise<void> {
  await window.api.token.clear();
}

/**
 * Try to refresh the access token using the stored refresh token.
 * Returns new tokens on success, null if refresh fails.
 */
export async function refreshTokens(): Promise<AuthTokens | null> {
  try {
    const stored = await window.api.token.get();
    if (!stored?.refreshToken) return null;

    const serverUrl = (await window.api.store.get("serverUrl")) as string;
    const base = serverUrl.replace(/\/$/, "");

    const { data } = await axios.post<AuthTokens>(`${base}/api/auth/refresh`, {
      refreshToken: stored.refreshToken,
    });

    await window.api.token.set(data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Check whether valid tokens are stored (used on app launch).
 */
export async function hasStoredTokens(): Promise<boolean> {
  const tokens = await window.api.token.get();
  return !!(tokens?.accessToken && tokens?.refreshToken);
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { hasStoredTokens, logout as apiLogout } from "@renderer/api/auth";

interface AuthState {
  /** null = still initialising, false = not authed, true = authed */
  authenticated: boolean | null;
  logout: () => Promise<void>;
  markAuthenticated: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  // On mount: check whether valid tokens are persisted
  useEffect(() => {
    hasStoredTokens()
      .then((has) => setAuthenticated(has))
      .catch(() => setAuthenticated(false));
  }, []);

  // Listen for token invalidation events fired by the axios refresh interceptor
  useEffect(() => {
    const handleLogout = (): void => setAuthenticated(false);
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAuthenticated(false);
  }, []);

  const markAuthenticated = useCallback(() => {
    setAuthenticated(true);
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, logout, markAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

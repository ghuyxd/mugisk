import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>("dark");

  // On mount: load persisted theme
  useEffect(() => {
    window.api.store
      .get("theme")
      .then((stored) => {
        const t = (stored as Theme | undefined) ?? "dark";
        setTheme(t);
        applyTheme(t);
      })
      .catch(() => {
        applyTheme("dark");
      });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      // Persist asynchronously — no need to await
      void window.api.store.set("theme", next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

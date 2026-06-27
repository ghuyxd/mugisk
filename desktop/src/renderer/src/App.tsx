import React from "react";

import { AuthProvider } from "@renderer/context/AuthContext";
import { ThemeProvider } from "@renderer/context/ThemeContext";
import { PlayerProvider } from "@renderer/context/PlayerContext";
import { FavoritesProvider } from "@renderer/context/FavoritesContext";
import AppRouter from "@renderer/router/index";

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlayerProvider>
          <FavoritesProvider>
            <AppRouter />
          </FavoritesProvider>
        </PlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

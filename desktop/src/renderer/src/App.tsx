import React from "react";

import { AuthProvider } from "@renderer/context/AuthContext";
import { ThemeProvider } from "@renderer/context/ThemeContext";
import AppRouter from "@renderer/router/index";

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}

import { resolve } from "path";

import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import tailwindcss from "tailwindcss";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        "@main": resolve("src/main"),
        "@shared": resolve("src/shared"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@shared": resolve("src/shared"),
      },
    },
    plugins: [react()],
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
  },
});

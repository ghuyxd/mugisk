import { contextBridge, ipcRenderer } from "electron";

import { electronAPI } from "@electron-toolkit/preload";

// Use `contextBridge` APIs to expose Electron APIs to the renderer
// (only when context isolation is enabled)
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", {
      // ── Token storage (safeStorage-backed) ──────────────────────────────
      token: {
        get: (): Promise<{ accessToken: string; refreshToken: string } | null> =>
          ipcRenderer.invoke("token:get"),
        set: (data: {
          accessToken: string;
          refreshToken: string;
        }): Promise<boolean> => ipcRenderer.invoke("token:set", data),
        clear: (): Promise<boolean> => ipcRenderer.invoke("token:clear"),
      },
      // ── Persistent preferences (electron-store) ──────────────────────────
      store: {
        get: (key: string): Promise<unknown> =>
          ipcRenderer.invoke("store:get", key),
        set: (key: string, value: unknown): Promise<boolean> =>
          ipcRenderer.invoke("store:set", key, value),
      },
      // ── Window controls (frameless window) ──────────────────────────────
      window: {
        minimize: () => ipcRenderer.send("window:minimize"),
        maximize: () => ipcRenderer.send("window:maximize"),
        close: () => ipcRenderer.send("window:close"),
      },
    });
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = {};
}

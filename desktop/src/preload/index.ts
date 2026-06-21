import { contextBridge, ipcRenderer } from "electron";

import { electronAPI } from "@electron-toolkit/preload";

// Use `contextBridge` APIs to expose Electron APIs to the renderer
// (only when context isolation is enabled, otherwise global Node.js APIs
// will be available in the renderer)
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", {
      // Placeholder: expose IPC channels here as the app grows
      // Example: openFilePicker: () => ipcRenderer.invoke("dialog:openFile"),
      ping: () => ipcRenderer.invoke("ping"),
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

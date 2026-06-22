import { app, BrowserWindow, ipcMain, shell } from "electron";
import { join } from "path";

import { is } from "@electron-toolkit/utils";

import { registerIpcHandlers } from "./ipc";
import { initUpdater } from "./updater";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    backgroundColor: "#0a0a0f",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Show window once ready to prevent visual flash
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Load the app
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// Window control IPC (for custom frameless titlebar)
ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on("window:close", () => mainWindow?.close());

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    mainWindow = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  app.setAppUserModelId("io.mugisk.desktop");
  registerIpcHandlers();
  createWindow();
  initUpdater();
});

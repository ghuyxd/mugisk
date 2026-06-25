/**
 * IPC handlers for the main process.
 *
 * Token storage:  Electron safeStorage (OS keychain-backed AES-256)
 *                 Encrypted blob saved to userData/tokens.enc
 * Settings store: electron-store (JSON file in userData, non-sensitive prefs)
 */

import { app, ipcMain, safeStorage } from "electron";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import Store from "electron-store";

// ── electron-store for non-sensitive preferences ─────────────────────────────

interface StoreSchema {
  theme: "dark" | "light";
  serverUrl: string;
}

const store = new Store<StoreSchema>({
  defaults: {
    theme: "dark",
    serverUrl: "",
  },
});

// ── safeStorage token helpers ─────────────────────────────────────────────────

function tokenFilePath(): string {
  return join(app.getPath("userData"), "tokens.enc");
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
}

function readTokens(): TokenData | null {
  const path = tokenFilePath();
  if (!existsSync(path)) return null;
  try {
    const data = readFileSync(path);
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const decrypted = safeStorage.decryptString(data);
        return JSON.parse(decrypted) as TokenData;
      } catch {
        // Fallback if the file was written without encryption
        return JSON.parse(data.toString("utf8")) as TokenData;
      }
    } else {
      return JSON.parse(data.toString("utf8")) as TokenData;
    }
  } catch {
    return null;
  }
}

function writeTokens(data: TokenData): void {
  const path = tokenFilePath();
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(JSON.stringify(data));
    writeFileSync(path, encrypted);
  } else {
    console.warn("[IPC] safeStorage not available, storing tokens unencrypted.");
    writeFileSync(path, Buffer.from(JSON.stringify(data), "utf8"));
  }
}

function clearTokens(): void {
  const path = tokenFilePath();
  if (existsSync(path)) {
    try {
      const { unlinkSync } = require("fs") as typeof import("fs");
      unlinkSync(path);
    } catch {
      // Ignore
    }
  }
}

// ── Register all handlers ────────────────────────────────────────────────────

export function registerIpcHandlers(): void {
  // Token: get
  ipcMain.handle("token:get", () => {
    return readTokens();
  });

  // Token: set
  ipcMain.handle(
    "token:set",
    (_event, data: { accessToken: string; refreshToken: string }) => {
      writeTokens(data);
      return true;
    },
  );

  // Token: clear
  ipcMain.handle("token:clear", () => {
    clearTokens();
    return true;
  });

  // Store: get
  ipcMain.handle("store:get", (_event, key: keyof StoreSchema) => {
    return store.get(key);
  });

  // Store: get-sync
  ipcMain.on("store:get-sync", (event, key: keyof StoreSchema) => {
    event.returnValue = store.get(key);
  });

  // Store: set
  ipcMain.handle(
    "store:set",
    (_event, key: keyof StoreSchema, value: StoreSchema[keyof StoreSchema]) => {
      store.set(key, value);
      return true;
    },
  );
}

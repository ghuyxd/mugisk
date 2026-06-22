/**
 * Auto-updater stub wired with electron-updater.
 * Feed URL points to a placeholder; swap for a real GitHub releases URL
 * or S3 bucket when ready to ship.
 */

import { app } from "electron";

import { autoUpdater } from "electron-updater";

const PLACEHOLDER_FEED = "https://releases.mugisk.io/desktop";

export function initUpdater(): void {
  if (!app.isPackaged) {
    // Skip auto-update checks during development
    return;
  }

  autoUpdater.setFeedURL({
    provider: "generic",
    url: PLACEHOLDER_FEED,
  });

  autoUpdater.logger = console;
  autoUpdater.autoDownload = false;

  autoUpdater.on("update-available", (info) => {
    console.log("[Updater] Update available:", info.version);
    // TODO: Notify renderer via IPC in a later phase
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[Updater] App is up-to-date.");
  });

  autoUpdater.on("error", (err: Error) => {
    console.error("[Updater] Error:", err.message);
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(`[Updater] Download progress: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("[Updater] Update downloaded:", info.version);
    // TODO: Prompt user and call autoUpdater.quitAndInstall() in a later phase
  });

  void autoUpdater.checkForUpdates();
}

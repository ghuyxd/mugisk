# Building the Client

Mugisk's desktop client is built with Electron and packaged using `electron-builder`. This guide shows you how to build the application for distribution across various platforms.

## Prerequisites
- Node.js ≥ 20
- pnpm
- Ensure you have run `pnpm install` in the monorepo root.

## Building the Client

To build the client, navigate to the `desktop` directory (or use pnpm filters from the root) and run the build script.

1. **Build the assets (Vite + TypeScript):**
   ```bash
   pnpm --filter @mugisk/desktop build
   ```

2. **Package the application:**
   You can run `electron-builder` to package the app for your current operating system. By default, `electron-builder` builds for the current OS.

   ```bash
   cd desktop
   npx electron-builder
   ```

   Alternatively, to specify targets:
   - **Linux:**
     ```bash
     npx electron-builder --linux
     ```
     This produces `.deb` and `.AppImage` files.
   - **Windows:**
     ```bash
     npx electron-builder --win
     ```
     This produces an `.exe` installer (NSIS).
   - **macOS:**
     ```bash
     npx electron-builder --mac
     ```
     This produces `.dmg` and `.zip` files. (Requires building on macOS or using a compatible service).

## Build Output
The packaged applications and installers will be output to the `desktop/dist/` directory.

## Updating the Application Icon
Currently, the application uses a placeholder icon in `desktop/resources/icon.png`. To use your own icon:
1. Replace `desktop/resources/icon.png` with a high-resolution PNG image (at least 512x512 pixels).
2. `electron-builder` will automatically pick up this file for Windows, Linux, and macOS builds.

# Building the Desktop Client

Mugisk's desktop client is a React application wrapped in Electron and packaged using `electron-builder`. This guide shows you how to build the application into an executable for distribution across Windows, macOS, or Linux.

## Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9
- Ensure you have run `pnpm install` in the monorepo root to install all dependencies.

## Build Steps

To build the client, navigate to the `desktop` directory (or use pnpm filters from the root) and run the build script.

1. **Build the assets (Vite + TypeScript):**
   ```bash
   pnpm --filter @mugisk/desktop build
   ```
   This compiles the React code and Electron main process into `desktop/out/`.

2. **Package the application:**
   You can run `electron-builder` to package the app for your current operating system. Navigate into the desktop folder:
   ```bash
   cd desktop
   npx electron-builder
   ```

   **Specifying OS Targets:**
   - **Linux:**
     ```bash
     npx electron-builder --linux
     ```
     Produces `.deb` and `.AppImage` files.
   - **Windows:**
     ```bash
     npx electron-builder --win
     ```
     Produces an `.exe` installer (NSIS).
   - **macOS:**
     ```bash
     npx electron-builder --mac
     ```
     Produces `.dmg` and `.zip` files. (Note: macOS builds require a macOS environment).

## Build Output
The packaged applications and installers will be saved to the `desktop/dist/` directory.

## Updating the Application Icon
Currently, the application uses a placeholder icon in `desktop/resources/icon.png`. To use your own icon:
1. Replace `desktop/resources/icon.png` with a high-resolution PNG image (at least 512x512 pixels).
2. `electron-builder` will automatically pick up this file for Windows, Linux, and macOS builds.

## Setting Default Server URL (Optional)
If you are building the client to distribute to your friends/family and want it to default to your specific server:
You can hardcode or modify the initial state in `desktop/src/renderer/src/api/axios.ts` or let users fill out the Server URL input field on the Login screen of the app. By default, the app points to `http://localhost:3000`.

# Building the Mugisk Desktop Client

The Mugisk desktop client is built with Electron and React. It uses `electron-builder` to package the app into distributable formats for Windows, macOS, and Linux.

## Prerequisites

- Node.js (v20+ recommended)
- `pnpm` package manager
- (For Windows builds on non-Windows) `wine` and `mono` installed
- (For macOS builds) A macOS environment is required to build the `.dmg` and `.zip` targets properly, especially if code-signing.

## Installation

Ensure you have installed the monorepo dependencies from the root directory:

```bash
cd mugisk
pnpm install
```

## Local Development

To run the desktop client locally in development mode (with hot-reload):

```bash
pnpm --filter @mugisk/desktop run dev
```

## Packaging for Distribution

To build the executable files, you must first compile the TypeScript and Vite assets, and then run `electron-builder`.

### 1. Compile Assets

```bash
pnpm --filter @mugisk/desktop run build
```

This will output the compiled files into the `desktop/out` directory.

### 2. Build Executables

Run `electron-builder` from within the `desktop` directory to package the app.

Navigate to the desktop directory:
```bash
cd desktop
```

#### Build for your current platform:
```bash
npx electron-builder
```

#### Build for specific platforms:

**Windows (NSIS installer .exe):**
```bash
npx electron-builder --win
```

**macOS (.dmg and .zip):**
```bash
npx electron-builder --mac
```
*(Note: Requires a macOS environment)*

**Linux (.AppImage and .deb):**
```bash
npx electron-builder --linux
```

### Build Outputs

Once the build finishes, the executable packages will be located in the `desktop/dist` folder.

- **Windows:** `desktop/dist/Mugisk Setup <version>.exe`
- **macOS:** `desktop/dist/Mugisk-<version>.dmg`
- **Linux:** `desktop/dist/Mugisk-<version>.AppImage` and `desktop/dist/mugisk_<version>_amd64.deb`

## Cross-Platform Compilation Notes

`electron-builder` supports building Windows and Linux targets from a macOS environment, provided you have the necessary dependencies installed via Homebrew or standard package managers. 

However, building macOS `.dmg` files from Windows or Linux is not supported due to Apple's proprietary toolchain requirements.

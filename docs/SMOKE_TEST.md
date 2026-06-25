# Mugisk End-to-End Smoke Test Checklist

This checklist is used to perform a full sanity check on the entire Mugisk system prior to deployment or oral defense. Follow these steps in order.

### Pre-requisites
- [ ] Ensure Docker is running.
- [ ] Run `docker compose down -v` to clear any existing volumes.
- [ ] Ensure a folder with at least 2 `.mp3` files (with ID3 metadata and cover art) exists locally.

### Phase 0: Scaffolding & Setup
- [ ] Run `docker compose up -d --build`. Verify no build errors.
- [ ] Check logs (`docker compose logs server -f`). Verify Prisma migrations and seed script completed without errors.

### Phase 1: Database & Prisma
- [ ] Navigate to `http://localhost:3000/api/admin/health` (or equivalent health endpoint if created) and ensure the DB status is connected.

### Phase 2: Auth API & JWT
- [ ] Open the built Desktop client.
- [ ] Attempt to login with `admin` / `admin`. It should succeed.
- [ ] Wait 15 minutes (or artificially shorten token lifespan in code) and verify you are not logged out, proving refresh-token rotation works.

### Phase 3: Library File Watcher
- [ ] Drop a new `.mp3` file into the mounted music library folder on your host machine.
- [ ] Wait ~5 seconds, then refresh the Admin Panel or Desktop Client and verify the track appears automatically without manual rescanning.

### Phase 4: Core API (CRUD & Streaming)
- [ ] In the Desktop Client, click "Play" on a track. Verify audio plays smoothly.
- [ ] Scrub the seek bar forward and backward. Verify HTTP Range requests work and playback resumes correctly.

### Phase 5: Admin Panel UI
- [ ] Navigate to `http://localhost:3000/admin` in a browser and login.
- [ ] Verify the dashboard shows correct statistics (e.g., number of tracks, artists).
- [ ] Use the Admin Panel file upload interface to upload a new track, and verify it appears in the library.

### Phase 6: Desktop App Structure (Electron + React)
- [ ] Verify the Desktop Client connects successfully using the generic "Server URL" input field at startup.
- [ ] Navigate between "Library" and "Playlists" views without losing playback state.

### Phase 7: Playlists & State
- [ ] Create a new Playlist named "Test Playlist" in the Desktop Client.
- [ ] Drag and drop two tracks into "Test Playlist".
- [ ] Reorder the tracks within the playlist via drag-and-drop, and verify the new order persists across a hard refresh of the app.

### Phase 8: AI Playlist Generator
- [ ] Click the "Generate AI Playlist" button (assuming `AI_API_KEY` is provided in `.env`).
- [ ] Provide a prompt like "Upbeat driving music".
- [ ] Verify the playlist is created with a relevant title and contains tracks matching the description.

### Phase 9: Deployment & Packaging
- [ ] Run the electron builder (`pnpm --filter @mugisk/desktop run build` then `npx electron-builder --dir`).
- [ ] Open the packaged executable in `dist/` and verify the app runs independently from the development terminal.

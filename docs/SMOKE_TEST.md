# Final Smoke-Test Checklist

This checklist is designed to verify the entire Mugisk system end-to-end before a demonstration or defense. Perform these steps sequentially.

- [ ] **Phase 0-1 (Scaffolding):**
  Verify the monorepo structure is intact and `pnpm install` succeeds without errors. The workspace should correctly link `@mugisk/shared-types` to both server and desktop.

- [ ] **Phase 2 (Library):**
  Add a few MP3/FLAC files to the `MUSIC_LIBRARY_PATH` directory. Verify that the server's chokidar watcher detects them, parses the metadata using `music-metadata`, and populates the database (visible via Prisma Studio or the `/api/library/tracks` endpoint).

- [ ] **Phase 3 (Auth):**
  Send a `POST` request to `/api/auth/login` with valid credentials. Verify that you receive an access token and a refresh token, and that subsequent requests to protected routes succeed using the `Authorization: Bearer <token>` header.

- [ ] **Phase 4 (Desktop Player):**
  Launch the Electron client. Log in successfully, navigate the library view, and verify that audio playback works by streaming a track from the Next.js server.

- [ ] **Phase 5 (Admin Panel):**
  Access the Admin Panel via a web browser (e.g., `http://localhost:3000/admin`). Upload a new track through the interface and verify it appears in the library. Test cover art extraction capabilities.

- [ ] **Phase 6 (AI Features):**
  Ensure an `AI_API_KEY` is set in `.env`. Trigger the auto-tagging endpoint (`/api/ai/tag`) on a track with missing metadata and verify that the LLM successfully populates the missing fields based on the filename/context.

- [ ] **Phase 7 (Refinement):**
  Test keyboard shortcuts (Play/Pause, Next, Previous) in the Electron client. Ensure the UI responds gracefully to different window sizes and maintains a polished Feishin-style aesthetic.

- [ ] **Phase 8 (Deployment):**
  Run `docker-compose up --build` on a clean environment. Verify that the containers start, migrations run automatically, and the application is fully accessible on port 3000 without any manual configuration steps.

# Report Notes: Technology Choices

These notes summarize the architectural and technical decisions made during the development of Mugisk, providing a foundation for a written report or oral defense.

## 1. Why Electron?
Electron was chosen for the desktop client over alternatives like Tauri or a purely web-based PWA due to its mature ecosystem and deep integration with web technologies (React/Vite). It provides cross-platform support (Windows, macOS, Linux) with a single codebase. Furthermore, Electron's IPC (Inter-Process Communication) model allows for a clear separation between the UI (Renderer process) and system-level tasks (Main process), which is critical for handling media keys, tray icons, and robust audio streaming seamlessly.

## 2. Why Next.js for both API and Admin?
Next.js (App Router) serves a dual purpose in Mugisk: it provides a robust, scalable backend for the REST API consumed by the Electron client, while simultaneously serving the Admin Panel web application. This unified approach eliminates the need to maintain a separate Node.js/Express backend and a React frontend for administration. It simplifies deployment, enables code sharing (types, utilities, Prisma client), and leverages Next.js's built-in optimizations and routing capabilities.

## 3. Why PostgreSQL and Prisma?
PostgreSQL is a powerful, reliable, and open-source relational database well-suited for modeling the complex relationships inherent in a music library (Artists ↔ Albums ↔ Tracks ↔ Playlists). Prisma was selected as the ORM because of its type-safe query builder, intuitive schema definition, and excellent integration with TypeScript. It drastically reduces boilerplate code for database interactions and provides an automated migration system, which is crucial for the continuous deployment described in Phase 8.

## 4. Why JWT Refresh-Token Rotation?
Mugisk implements a secure authentication flow using short-lived access tokens and long-lived refresh tokens. Refresh-token rotation enhances security by invalidating old refresh tokens upon use, mitigating the risk of stolen tokens. This stateless authentication mechanism avoids database lookups for every API request, improving performance, while still allowing the server to revoke access when necessary.

## 5. Why Chokidar for Auto-Updating the Library?
`chokidar` is a highly efficient file-watching library for Node.js. By integrating it into the Next.js server, Mugisk can continuously monitor the `MUSIC_LIBRARY_PATH` for changes (adds, deletes, modifications). This ensures that the database stays perfectly synchronized with the underlying file system automatically, removing the need for the user to trigger manual rescans, resulting in a seamless "drop and play" experience.

## 6. Why the AI layer was isolated behind a feature flag?
The AI capabilities (auto-tagging, smart playlists) rely on external, paid APIs (Anthropic/OpenAI). By isolating these features behind a feature flag (the `AI_API_KEY` environment variable), the application remains fully functional for users who prefer a completely offline, local-only, and free experience. This modular architecture adheres to the "self-hosted" philosophy of maintaining user control, ensuring the AI components are strictly opt-in enhancements rather than hard dependencies.

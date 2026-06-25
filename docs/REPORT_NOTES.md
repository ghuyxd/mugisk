# Mugisk Project - Report Notes

This document provides a summary of the key architectural and technology decisions made during the development of Mugisk, intended to be adapted for the final written report and oral defense.

## 1. Electron for the Desktop Client
Electron was chosen for the desktop client because it allows the development of cross-platform desktop applications (Windows, macOS, Linux) using standard web technologies (React, HTML, CSS). This significantly reduced development time compared to building native applications for each platform. It also allows the desktop client to feel native while utilizing a mature frontend ecosystem. The auto-update capabilities provided by `electron-updater` also ensure users always have the latest version seamlessly.

## 2. Next.js for Both API and Admin Panel
Next.js was selected as the foundational framework for the backend. By leveraging Next.js Route Handlers (`app/api/...`), we could build a robust RESTful API while keeping the Admin Panel frontend in the exact same codebase. This unified approach simplified code sharing (types, database schemas, utility functions) and reduced the overhead of managing a separate frontend and backend repository. The use of React Server Components and Server Actions in the Admin Panel also minimized client-side JavaScript, resulting in a fast, highly secure administrative interface.

## 3. PostgreSQL and Prisma ORM
PostgreSQL was chosen as the relational database due to its reliability, strict data integrity, and support for complex queries—essential for managing relationships between artists, albums, tracks, and playlists. Prisma ORM was introduced to provide an intuitive, type-safe API for interacting with the database. The single source of truth provided by the `schema.prisma` file guaranteed that our backend logic and database structure remained perfectly synchronized, significantly reducing runtime errors.

## 4. JWT Refresh-Token Rotation
For authentication between the Electron client and the Next.js API, we implemented stateless JSON Web Tokens (JWT) with a refresh-token rotation strategy. This avoids the need for stateful server-side sessions, aligning well with the RESTful architecture. The refresh-token rotation specifically mitigates the risk of token theft—if a refresh token is compromised, its reuse can be detected, invalidating the token family. This provides a balance between high security and excellent user experience (users remain logged in indefinitely without frequent prompts).

## 5. Chokidar for Filesystem Monitoring
The `chokidar` library was implemented in a background service to monitor the `MUSIC_LIBRARY_PATH` for filesystem changes. This approach allows Mugisk to automatically detect new tracks dropped into the folder, or tracks that were deleted, without requiring the user to manually trigger a "rescan." It provides a seamless user experience that feels completely integrated with the host operating system.

## 6. Isolating the AI Layer Behind a Feature Flag
The AI features (e.g., auto-generating playlist names and semantic track recommendations) heavily rely on external API availability (the Gemini API). We deliberately isolated this functionality behind a feature flag (`AI_API_KEY`). This defensive design decision ensures that if the API is unreachable, rate-limited, or if the user chooses not to provide a key, the core functionality of Mugisk (streaming, manual playlists, library management) gracefully degrades without causing system-wide failures.

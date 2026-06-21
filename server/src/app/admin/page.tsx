import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel — Mugisk",
  description: "Manage your Mugisk music library and server settings",
};

export default function AdminPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-4xl font-bold" style={{ color: "var(--color-text)" }}>
          Admin Panel
        </h1>
        <p className="text-base" style={{ color: "var(--color-muted)" }}>
          The admin panel will be implemented in a future phase. Authentication, library
          management, user management, and server configuration will live here.
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-5 py-2.5 rounded-lg text-sm font-medium"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          }}
        >
          ← Back to home
        </a>
      </div>
    </main>
  );
}

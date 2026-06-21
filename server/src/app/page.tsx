import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mugisk — Self-Hosted Music Streaming",
  description:
    "Stream your personal music library from anywhere. Mugisk is a self-hosted, open-source music streaming platform.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        {/* Logo / Wordmark */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black text-white"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
            }}
          >
            M
          </div>
          <span className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
            mugisk
          </span>
        </div>

        <h1
          className="text-5xl font-extrabold tracking-tight leading-tight"
          style={{ color: "var(--color-text)" }}
        >
          Your Music,{" "}
          <span style={{ color: "var(--color-accent-light)" }}>Your Server</span>
        </h1>

        <p className="text-lg leading-relaxed" style={{ color: "var(--color-muted)" }}>
          A self-hosted music streaming platform built for audiophiles. Stream your entire library
          from any device, anywhere — with no subscriptions, no ads, no compromises.
        </p>

        {/* Status badge */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
            style={{
              background: "rgba(124, 58, 237, 0.15)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              color: "var(--color-accent-light)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "#10b981", boxShadow: "0 0 8px #10b981" }}
            />
            Server is running
          </span>
        </div>

        {/* Stack cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8">
          {[
            { label: "Next.js 16", icon: "▲", desc: "App Router" },
            { label: "PostgreSQL", icon: "🐘", desc: "via Prisma" },
            { label: "TypeScript", icon: "⟨⟩", desc: "Strict mode" },
            { label: "Tailwind", icon: "✦", desc: "v4" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-4 text-left space-y-1"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="text-xl">{item.icon}</div>
              <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {item.label}
              </div>
              <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation links */}
        <div className="flex items-center justify-center gap-4 pt-6">
          <a
            href="/api/health"
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "var(--color-accent)",
              color: "#fff",
            }}
          >
            Health Check →
          </a>
          <a
            href="/admin"
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            Admin Panel
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-xs" style={{ color: "var(--color-muted)" }}>
        mugisk v0.1.0 — scaffolding phase
      </footer>
    </main>
  );
}

/**
 * src/instrumentation.ts
 *
 * Next.js Instrumentation Hook — runs ONCE when the Node.js server process
 * starts (both `next dev` and `next start`).
 *
 * This is the correct place to initialise long-lived singleton services like
 * the chokidar file watcher. Importing from the route handlers would restart
 * the watcher on every request; putting it here ensures a single instance.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register(): Promise<void> {
  // Only run in the Node.js runtime — not in Edge or during client-side
  // bundling. The `process.env.NEXT_RUNTIME` check is the official guard.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWatcher } = await import("@/lib/library/watcher");
    startWatcher();

    const { startExploreCron } = await import("@/lib/cron");
    startExploreCron();
  }
}

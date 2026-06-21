/**
 * src/lib/rate-limit.ts
 *
 * Simple in-memory token-bucket rate limiter.
 * Suitable for a single-process server (e.g. self-hosted Mugisk).
 * For multi-process / multi-node deployments a Redis-backed solution
 * would be needed.
 *
 * Usage:
 *   const limiter = new RateLimiter({ limit: 10, windowMs: 60_000 });
 *   if (!limiter.check(ip)) return Response with 429
 */

interface Bucket {
  tokens: number;
  /** Unix timestamp (ms) of the last refill. */
  lastRefill: number;
}

interface RateLimiterOptions {
  /** Maximum requests allowed per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly buckets = new Map<string, Bucket>();

  constructor(options: RateLimiterOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
  }

  /**
   * Check whether `key` (typically an IP address) is within rate limits.
   * Consumes one token if available.
   * @returns `true` if the request is allowed, `false` if it should be blocked.
   */
  check(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.limit - 1, lastRefill: now };
      this.buckets.set(key, bucket);
      return true;
    }

    // Refill proportionally to elapsed time
    const elapsed = now - bucket.lastRefill;
    const refill = Math.floor((elapsed / this.windowMs) * this.limit);

    if (refill > 0) {
      bucket.tokens = Math.min(this.limit, bucket.tokens + refill);
      bucket.lastRefill = now;
    }

    if (bucket.tokens <= 0) {
      return false;
    }

    bucket.tokens -= 1;
    return true;
  }

  /** Remove all stale buckets (call periodically to prevent memory growth). */
  prune(): void {
    const cutoff = Date.now() - this.windowMs * 2;
    for (const [key, bucket] of this.buckets) {
      if (bucket.lastRefill < cutoff) {
        this.buckets.delete(key);
      }
    }
  }
}

// ── Shared rate limiters for auth routes ──────────────────────────────────────

/** 10 requests per 60 s per IP on login and register. */
export const authRateLimiter = new RateLimiter({ limit: 10, windowMs: 60_000 });

// Prune stale entries every 5 minutes (avoids unbounded memory growth).
if (typeof setInterval !== "undefined") {
  setInterval(() => authRateLimiter.prune(), 5 * 60_000);
}

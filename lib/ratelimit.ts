// lib/ratelimit.ts
// Upstash Redis rate limiting — replaces all in-memory Map-based limiters.
// Safe for serverless: each function call gets a fresh instance but shares
// state through Redis. Falls back gracefully if UPSTASH vars are missing
// in local dev (allows all requests through with a warning).

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ─── Redis client ─────────────────────────────────────────────────────────────

function createRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      if (process.env.NEXT_PHASE === "phase-production-build") {
        console.warn("[ratelimit] Upstash env vars missing — using null fallback for Next.js build phase");
        return null;
      }
      throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production.");
    }
    // Dev fallback — in-memory Redis mock isn't available, log warning and skip
    console.warn("[ratelimit] Upstash env vars missing — rate limiting disabled in dev");
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const redis = createRedis();

// ─── Rate limit factory ────────────────────────────────────────────────────────

function makeRatelimit(requests: number, window: Parameters<typeof Ratelimit.slidingWindow>[1], prefix: string) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `curasync:${prefix}`,
    analytics: true, // shows usage in Upstash console
  });
}

// ─── Named limiters (per PRD §6.3) ───────────────────────────────────────────

// Biometric readings: 1000 per patient per minute
export const readingLimiter = makeRatelimit(1000, "1 m", "readings");

// Journal entries: 5 per patient per 24 hours
export const journalLimiter = makeRatelimit(5, "24 h", "journal");

// PDF downloads: 5 per patient per 24 hours
export const pdfLimiter = makeRatelimit(5, "24 h", "pdf");

// AI Doctor: 100 per user per hour
export const aiLimiter = makeRatelimit(100, "1 h", "ai");

// Auth attempts: 10 per IP per minute (brute-force protection)
export const authLimiter = makeRatelimit(10, "1 m", "auth");

// ─── Helper — use in API routes ───────────────────────────────────────────────

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Unix ms timestamp
}

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitResult> {
  // No limiter = dev mode without Upstash — allow all
  if (!limiter) {
    return { allowed: true, remaining: 999, reset: Date.now() + 60_000 };
  }

  const { success, remaining, reset } = await limiter.limit(identifier);
  return { allowed: success, remaining, reset };
}

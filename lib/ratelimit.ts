// lib/ratelimit.ts
// Local mock rate limiter - replaces Upstash Redis rate limiting to remove external cloud dependencies.
// Safe for serverless and offline development. Always allows requests through.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Unix ms timestamp
}

// Dummy type to keep API routes clean without needing @upstash/ratelimit
export type RatelimitMock = {
  limiterName: string;
};

export const readingLimiter: RatelimitMock = { limiterName: "readings" };
export const journalLimiter: RatelimitMock = { limiterName: "journal" };
export const pdfLimiter: RatelimitMock = { limiterName: "pdf" };
export const aiLimiter: RatelimitMock = { limiterName: "ai" };
export const authLimiter: RatelimitMock = { limiterName: "auth" };

export async function checkRateLimit(
  limiter: RatelimitMock | null,
  identifier: string
): Promise<RateLimitResult> {
  // Always allow all requests in mock rate limiter
  return {
    allowed: true,
    remaining: 999,
    reset: Date.now() + 60_000,
  };
}

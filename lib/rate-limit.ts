/**
 * Simple in-memory sliding-window rate limiter keyed by IP.
 *
 * Suitable for single-instance / low-traffic deployments (including many
 * Vercel hobby workloads). For multi-region production at scale, swap the
 * store for a shared backend (e.g. Upstash Redis) without changing the API.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_REQUESTS = 5;

export type RateLimitOptions = {
  windowMs?: number;
  maxRequests?: number;
  /** Injected clock for tests. */
  now?: () => number;
};

function prune(bucket: Bucket, windowStart: number): void {
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
}

/**
 * Check and record a request for the given key (typically client IP).
 */
export function checkRateLimit(key: string, options: RateLimitOptions = {}): RateLimitResult {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const now = (options.now ?? Date.now)();
  const windowStart = now - windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  prune(bucket, windowStart);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs,
      limit: maxRequests,
    };
  }

  bucket.timestamps.push(now);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - bucket.timestamps.length),
    resetAt: now + windowMs,
    limit: maxRequests,
  };
}

/** Test helper — clear all buckets. */
export function resetRateLimitStore(): void {
  buckets.clear();
}

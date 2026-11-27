interface RateLimitEntry {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitEntry>();

// In-memory sliding-window rate limiter
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  const existing = buckets.get(key);
  const timestamps = existing
    ? existing.timestamps.filter((t) => t > cutoff)
    : [];

  if (timestamps.length >= limit) {
    const oldest = timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    buckets.set(key, { timestamps });
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  timestamps.push(now);
  buckets.set(key, { timestamps });

  // Prevent unbounded memory growth
  if (buckets.size > 5000) {
    for (const [k, v] of buckets.entries()) {
      if (v.timestamps.length === 0 || v.timestamps[v.timestamps.length - 1] < cutoff) {
        buckets.delete(k);
      }
    }
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, limit - timestamps.length),
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

import { afterEach, describe, expect, it } from "vitest";

import { checkRateLimit, resetRateLimitStore } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    resetRateLimitStore();
  });

  it("allows requests under the limit", () => {
    const now = 1_000_000;
    const opts = { maxRequests: 3, windowMs: 60_000, now: () => now };

    expect(checkRateLimit("1.1.1.1", opts).allowed).toBe(true);
    expect(checkRateLimit("1.1.1.1", opts).allowed).toBe(true);
    expect(checkRateLimit("1.1.1.1", opts).allowed).toBe(true);
  });

  it("blocks when max requests exceeded", () => {
    const now = 1_000_000;
    const opts = { maxRequests: 2, windowMs: 60_000, now: () => now };

    expect(checkRateLimit("2.2.2.2", opts).allowed).toBe(true);
    expect(checkRateLimit("2.2.2.2", opts).allowed).toBe(true);
    const blocked = checkRateLimit("2.2.2.2", opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("isolates keys by IP", () => {
    const now = 1_000_000;
    const opts = { maxRequests: 1, windowMs: 60_000, now: () => now };

    expect(checkRateLimit("a", opts).allowed).toBe(true);
    expect(checkRateLimit("a", opts).allowed).toBe(false);
    expect(checkRateLimit("b", opts).allowed).toBe(true);
  });

  it("resets after the window slides", () => {
    let now = 1_000_000;
    const opts = { maxRequests: 1, windowMs: 1_000, now: () => now };

    expect(checkRateLimit("3.3.3.3", opts).allowed).toBe(true);
    expect(checkRateLimit("3.3.3.3", opts).allowed).toBe(false);

    now += 1_001;
    expect(checkRateLimit("3.3.3.3", opts).allowed).toBe(true);
  });
});

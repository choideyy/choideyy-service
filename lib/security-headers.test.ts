import { describe, expect, it } from "vitest";

import { securityHeaders } from "@/lib/security-headers";

describe("securityHeaders", () => {
  it("includes baseline OWASP-oriented headers", () => {
    const headers = securityHeaders();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
    expect(headers["Cache-Control"]).toContain("no-store");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'none'");
  });
});

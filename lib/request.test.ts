import { describe, expect, it } from "vitest";

import {
  createRequestId,
  getClientIp,
  getUserAgent,
  isJsonContentType,
  MAX_BODY_BYTES,
  readJsonBody,
} from "@/lib/request";

describe("request helpers", () => {
  it("creates a request id", () => {
    expect(createRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("reads IP from x-forwarded-for", () => {
    const req = new Request("http://localhost/api/contact", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.9");
  });

  it("reads IP from x-real-ip", () => {
    const req = new Request("http://localhost/api/contact", {
      headers: { "x-real-ip": "198.51.100.2" },
    });
    expect(getClientIp(req)).toBe("198.51.100.2");
  });

  it("falls back to unknown IP", () => {
    expect(getClientIp(new Request("http://localhost/api/contact"))).toBe("unknown");
  });

  it("returns unknown when user-agent header is absent", () => {
    expect(getUserAgent(new Request("http://localhost/api/contact"))).toBe("unknown");
  });

  it("returns provided user agent", () => {
    const req = new Request("http://localhost/api/contact", {
      headers: { "user-agent": "Mozilla/5.0 vitest" },
    });
    expect(getUserAgent(req)).toBe("Mozilla/5.0 vitest");
  });

  it("detects JSON content type", () => {
    expect(
      isJsonContentType(
        new Request("http://localhost", {
          headers: { "content-type": "application/json; charset=utf-8" },
        }),
      ),
    ).toBe(true);
    expect(
      isJsonContentType(
        new Request("http://localhost", { headers: { "content-type": "text/plain" } }),
      ),
    ).toBe(false);
    expect(isJsonContentType(new Request("http://localhost"))).toBe(false);
  });

  it("reads a small JSON body", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
      headers: { "content-type": "application/json" },
    });
    const result = await readJsonBody(req);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toContain("ok");
  });

  it("rejects oversized Content-Length", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: "{}",
      headers: {
        "content-type": "application/json",
        "content-length": String(MAX_BODY_BYTES + 1),
      },
    });
    const result = await readJsonBody(req);
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("rejects empty body", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: "",
      headers: { "content-type": "application/json" },
    });
    const result = await readJsonBody(req);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty");
  });
});

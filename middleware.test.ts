import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { middleware } from "@/middleware";

describe("middleware", () => {
  beforeEach(() => {
    process.env.FRONTEND_ORIGIN = "https://choideyy.com";
  });

  afterEach(() => {
    delete process.env.FRONTEND_ORIGIN;
  });

  it("handles CORS preflight for allowlisted origin", () => {
    const req = new NextRequest("http://localhost:3000/api/contact", {
      method: "OPTIONS",
      headers: { origin: "https://choideyy.com" },
    });
    const res = middleware(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://choideyy.com");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("rejects preflight from unknown origin", () => {
    const req = new NextRequest("http://localhost:3000/api/contact", {
      method: "OPTIONS",
      headers: { origin: "https://evil.example" },
    });
    const res = middleware(req);
    expect(res.status).toBe(403);
  });

  it("adds security headers on normal API requests", () => {
    const req = new NextRequest("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { origin: "https://choideyy.com" },
    });
    const res = middleware(req);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });
});

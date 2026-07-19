import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { jsonResponse, optionsResponse } from "@/lib/http";

describe("http helpers", () => {
  beforeEach(() => {
    process.env.FRONTEND_ORIGIN = "https://choideyy.com";
  });

  afterEach(() => {
    delete process.env.FRONTEND_ORIGIN;
  });

  it("returns JSON success payloads with security headers", async () => {
    const req = new Request("http://localhost", {
      headers: { origin: "https://choideyy.com" },
    });
    const res = jsonResponse({ success: true }, { status: 200, request: req, requestId: "rid-1" });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("rid-1");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    await expect(res.json()).resolves.toEqual({ success: true });
  });

  it("returns OPTIONS 204", () => {
    const req = new Request("http://localhost", {
      headers: { origin: "https://choideyy.com" },
    });
    const res = optionsResponse(req, "rid-2");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://choideyy.com");
  });
});

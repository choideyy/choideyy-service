import { afterEach, describe, expect, it } from "vitest";

import { corsHeaders, isOriginAllowed, resolveAllowedOrigin } from "@/lib/cors";

describe("CORS helpers", () => {
  afterEach(() => {
    delete process.env.FRONTEND_ORIGIN;
    delete process.env.ALLOWED_ORIGIN;
  });

  it("allows requests with no Origin (non-browser)", () => {
    process.env.FRONTEND_ORIGIN = "https://choideyy.com";
    expect(isOriginAllowed(null)).toBe(true);
  });

  it("allows listed origins", () => {
    process.env.FRONTEND_ORIGIN = "https://choideyy.com,https://www.choideyy.com";
    expect(isOriginAllowed("https://choideyy.com")).toBe(true);
    expect(resolveAllowedOrigin("https://www.choideyy.com")).toBe("https://www.choideyy.com");
  });

  it("rejects unknown origins", () => {
    process.env.FRONTEND_ORIGIN = "https://choideyy.com";
    expect(isOriginAllowed("https://evil.example")).toBe(false);
    expect(resolveAllowedOrigin("https://evil.example")).toBeNull();
  });

  it("sets Access-Control-Allow-Origin only for allowlisted origins", () => {
    process.env.FRONTEND_ORIGIN = "https://choideyy.com";
    const allowed = corsHeaders("https://choideyy.com");
    expect(allowed["Access-Control-Allow-Origin"]).toBe("https://choideyy.com");
    expect(allowed["Access-Control-Allow-Methods"]).toContain("POST");

    const denied = corsHeaders("https://evil.example");
    expect(denied["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("supports ALLOWED_ORIGIN fallback", () => {
    process.env.ALLOWED_ORIGIN = "http://localhost:5173";
    expect(isOriginAllowed("http://localhost:5173")).toBe(true);
  });
});

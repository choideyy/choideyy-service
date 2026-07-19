import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", () => ({
  sendContactEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendContactEmail } from "@/lib/email";
import { resetRateLimitStore } from "@/lib/rate-limit";
import { OPTIONS, POST } from "@/app/api/contact/route";

const mockedSend = vi.mocked(sendContactEmail);

function contactRequest(
  body: unknown,
  init: { origin?: string | null; contentType?: string; ip?: string } = {},
): Request {
  const headers = new Headers();
  headers.set("content-type", init.contentType ?? "application/json");
  if (init.origin !== null) {
    headers.set("origin", init.origin ?? "https://choideyy.com");
  }
  if (init.ip) {
    headers.set("x-forwarded-for", init.ip);
  }
  headers.set("user-agent", "vitest");

  return new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = {
  name: "John Doe",
  email: "john@example.com",
  subject: "General enquiry",
  message: "Hello, I would like more information about Choideyy.",
  website: "",
};

describe("POST /api/contact", () => {
  beforeEach(() => {
    resetRateLimitStore();
    mockedSend.mockReset();
    mockedSend.mockResolvedValue(undefined);
    process.env.FRONTEND_ORIGIN = "https://choideyy.com";
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.FRONTEND_ORIGIN;
    vi.restoreAllMocks();
  });

  it("returns 200 on successful submission", async () => {
    const res = await POST(contactRequest(validBody, { ip: "10.0.0.1" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns 400 when a required field is missing", async () => {
    const body = { ...validBody } as Record<string, unknown>;
    delete body.name;
    const res = await POST(contactRequest(body, { ip: "10.0.0.2" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Validation failed");
    expect(json.details.some((d: { path: string }) => d.path === "name")).toBe(true);
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(contactRequest({ ...validBody, email: "bad" }, { ip: "10.0.0.3" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.details.some((d: { path: string }) => d.path === "email")).toBe(true);
  });

  it("returns 400 for empty message", async () => {
    const res = await POST(contactRequest({ ...validBody, message: "" }, { ip: "10.0.0.4" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when message exceeds max length", async () => {
    const res = await POST(
      contactRequest({ ...validBody, message: "M".repeat(5001) }, { ip: "10.0.0.5" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 415 for invalid Content-Type", async () => {
    const res = await POST(
      contactRequest(validBody, { contentType: "text/plain", ip: "10.0.0.6" }),
    );
    expect(res.status).toBe(415);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Unsupported Media Type",
    });
  });

  it("returns 400 when bot honeypot is filled", async () => {
    const res = await POST(
      contactRequest({ ...validBody, website: "http://bot.test" }, { ip: "10.0.0.7" }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.details[0].message).toBe("Invalid submission");
  });

  it("returns 400 when submission is too fast", async () => {
    const res = await POST(
      contactRequest({ ...validBody, formStartedAt: Date.now() - 100 }, { ip: "10.0.0.8" }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.details[0].path).toBe("formStartedAt");
  });

  it("returns 429 when rate limit exceeded", async () => {
    const ip = "10.0.0.9";
    for (let i = 0; i < 5; i++) {
      await POST(contactRequest(validBody, { ip }));
    }
    const res = await POST(contactRequest(validBody, { ip }));
    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Too many requests",
    });
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("returns 500 without leaking stack traces when email fails", async () => {
    mockedSend.mockRejectedValueOnce(new Error("SMTP connection refused\nSTACKTRACE"));
    const res = await POST(contactRequest(validBody, { ip: "10.0.0.10" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: "Internal server error" });
    expect(JSON.stringify(json)).not.toContain("STACKTRACE");
    expect(JSON.stringify(json)).not.toContain("SMTP");
  });

  it("returns 403 for disallowed origin", async () => {
    const res = await POST(
      contactRequest(validBody, { origin: "https://evil.example", ip: "10.0.0.11" }),
    );
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Origin not allowed",
    });
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(contactRequest("{", { ip: "10.0.0.12" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.details[0].message).toBe("Invalid JSON");
  });

  it("returns 413 when Content-Length exceeds limit", async () => {
    const headers = new Headers({
      "content-type": "application/json",
      origin: "https://choideyy.com",
      "x-forwarded-for": "10.0.0.14",
      "content-length": String(64 * 1024),
    });
    const res = await POST(
      new Request("http://localhost:3000/api/contact", {
        method: "POST",
        headers,
        body: "{}",
      }),
    );
    expect(res.status).toBe(413);
  });

  it("returns 400 for empty body", async () => {
    const headers = new Headers({
      "content-type": "application/json",
      origin: "https://choideyy.com",
      "x-forwarded-for": "10.0.0.15",
    });
    const res = await POST(
      new Request("http://localhost:3000/api/contact", {
        method: "POST",
        headers,
        body: "",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns CORS headers for allowlisted origin", async () => {
    const res = await POST(contactRequest(validBody, { ip: "10.0.0.13" }));
    expect(res.headers.get("access-control-allow-origin")).toBe("https://choideyy.com");
  });
});

describe("OPTIONS /api/contact", () => {
  beforeEach(() => {
    process.env.FRONTEND_ORIGIN = "https://choideyy.com";
  });

  afterEach(() => {
    delete process.env.FRONTEND_ORIGIN;
  });

  it("returns 204 for allowlisted origin", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "OPTIONS",
      headers: { origin: "https://choideyy.com" },
    });
    const res = await OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://choideyy.com");
  });

  it("returns 403 for unknown origin", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "OPTIONS",
      headers: { origin: "https://evil.example" },
    });
    const res = await OPTIONS(req);
    expect(res.status).toBe(403);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_SUBMISSION_AGE_MS, MIN_SUBMISSION_MS, validateContactPayload } from "@/lib/validation";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "John Doe",
    email: "john@example.com",
    subject: "General enquiry",
    message: "Hello, I would like to know more about your services.",
    formStartedAt: Date.now() - MIN_SUBMISSION_MS - 100,
    website: "",
    ...overrides,
  };
}

describe("validateContactPayload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a valid payload", () => {
    const result = validateContactPayload(validPayload());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John Doe");
      expect(result.data.email).toBe("john@example.com");
      expect(result.data.subject).toBe("General enquiry");
    }
  });

  it("accepts payload without formStartedAt (frontend compatibility)", () => {
    const payload = validPayload();
    delete (payload as { formStartedAt?: number }).formStartedAt;
    const result = validateContactPayload(payload);
    expect(result.success).toBe(true);
  });

  it("normalizes email to lowercase", () => {
    const result = validateContactPayload(validPayload({ email: "John@Example.COM" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("rejects missing name", () => {
    const payload = validPayload();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, ...rest } = payload;
    const result = validateContactPayload(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
      expect(result.details.some((d) => d.path === "name")).toBe(true);
    }
  });

  it("rejects name shorter than 2 characters", () => {
    const result = validateContactPayload(validPayload({ name: "A" }));
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = validateContactPayload(validPayload({ name: "A".repeat(101) }));
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = validateContactPayload(validPayload({ email: "not-an-email" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details.some((d) => d.path === "email")).toBe(true);
    }
  });

  it("rejects empty subject", () => {
    const result = validateContactPayload(validPayload({ subject: "   " }));
    expect(result.success).toBe(false);
  });

  it("rejects subject longer than 200 characters", () => {
    const result = validateContactPayload(validPayload({ subject: "S".repeat(201) }));
    expect(result.success).toBe(false);
  });

  it("rejects message shorter than 10 characters", () => {
    const result = validateContactPayload(validPayload({ message: "Too short" }));
    expect(result.success).toBe(false);
  });

  it("rejects message longer than 5000 characters", () => {
    const result = validateContactPayload(validPayload({ message: "M".repeat(5001) }));
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (strict mode)", () => {
    const result = validateContactPayload(validPayload({ extra: "nope" }));
    expect(result.success).toBe(false);
  });

  it("rejects filled honeypot (website)", () => {
    const result = validateContactPayload(validPayload({ website: "http://spam.test" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details[0]?.message).toBe("Invalid submission");
    }
  });

  it("rejects filled honeypot (company)", () => {
    const result = validateContactPayload(validPayload({ company: "Acme Bot Corp" }));
    expect(result.success).toBe(false);
  });

  it("rejects submissions that are too fast", () => {
    const result = validateContactPayload(validPayload({ formStartedAt: Date.now() - 500 }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details[0]?.path).toBe("formStartedAt");
      expect(result.details[0]?.message).toBe("Submission too fast");
    }
  });

  it("rejects expired formStartedAt", () => {
    const result = validateContactPayload(
      validPayload({ formStartedAt: Date.now() - MAX_SUBMISSION_AGE_MS - 1 }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details[0]?.message).toBe("Submission expired");
    }
  });

  it("strips CR/LF from subject (email header injection)", () => {
    const result = validateContactPayload(
      validPayload({ subject: "Hello\r\nBcc: evil@example.com" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).not.toMatch(/[\r\n]/);
      expect(result.data.subject).toBe("HelloBcc: evil@example.com");
    }
  });

  it("rejects non-object payloads", () => {
    expect(validateContactPayload(null).success).toBe(false);
    expect(validateContactPayload("string").success).toBe(false);
    expect(validateContactPayload(42).success).toBe(false);
  });
});

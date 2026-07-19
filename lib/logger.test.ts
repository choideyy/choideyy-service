import { afterEach, describe, expect, it, vi } from "vitest";

import { logContactEvent, logError } from "@/lib/logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs success as info JSON without secrets", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logContactEvent({
      requestId: "abc",
      timestamp: "2026-07-19T12:00:00.000Z",
      ip: "1.2.3.4",
      success: true,
      statusCode: 200,
      userAgent: "test",
    });
    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0]?.[0]);
    expect(line).toContain('"success":true');
    expect(line).not.toContain("SMTP_PASS");
    expect(line).not.toContain("password");
  });

  it("strips newlines from log fields", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logContactEvent({
      requestId: "id\ninjected",
      timestamp: "2026-07-19T12:00:00.000Z",
      ip: "1.2.3.4",
      success: false,
      reason: "bad\nreason",
      userAgent: "ua",
    });
    const line = String(warn.mock.calls[0]?.[0]);
    const parsed = JSON.parse(line) as { requestId: string; reason: string };
    expect(parsed.requestId).not.toContain("\n");
    expect(parsed.reason).not.toContain("\n");
  });

  it("logs errors without throwing", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logError("req-1", "boom\nstack");
    expect(error).toHaveBeenCalledTimes(1);
    const line = String(error.mock.calls[0]?.[0]);
    expect(line).toContain("contact_error");
    expect(line).not.toContain("\nstack");
  });
});

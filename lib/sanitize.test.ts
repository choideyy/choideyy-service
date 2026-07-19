import { describe, expect, it } from "vitest";

import {
  escapeHtml,
  sanitizeEmailSubject,
  sanitizeForHeader,
  sanitizeForLog,
} from "@/lib/sanitize";

describe("sanitize helpers", () => {
  it("removes newlines from log output", () => {
    expect(sanitizeForLog("ok\ninjected\rline")).toBe("ok injected line");
  });

  it("strips header injection sequences", () => {
    expect(sanitizeForHeader("Hi\r\nBcc: evil@x.com")).toBe("HiBcc: evil@x.com");
    expect(sanitizeEmailSubject("Sub%0aInjected")).toBe("SubInjected");
  });

  it("escapes HTML entities", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });
});

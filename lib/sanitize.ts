/**
 * Security helpers for sanitizing user input before use in logs, headers, or email.
 */

const CONTROL_AND_NEWLINE = /[\u0000-\u001F\u007F\u0080-\u009F]/g;
/** CR/LF and common URL-encoded variants used in header injection attacks. */
const HEADER_INJECTION = /\r|\n|%0d|%0a/gi;

/** Strip control characters and newlines to prevent log injection. */
export function sanitizeForLog(value: string, maxLength = 200): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(CONTROL_AND_NEWLINE, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Reject / neutralize CR/LF and encoded variants used in header injection. */
export function sanitizeForHeader(value: string, maxLength = 200): string {
  return value
    .replace(HEADER_INJECTION, "")
    .replace(CONTROL_AND_NEWLINE, "")
    .trim()
    .slice(0, maxLength);
}

/** Escape HTML entities for safe inclusion in HTML email bodies. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Normalize whitespace and trim for plain-text fields. */
export function sanitizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

/** Remove characters that could break email headers (subject, From display, etc.). */
export function sanitizeEmailSubject(value: string): string {
  return sanitizeForHeader(value, 200);
}

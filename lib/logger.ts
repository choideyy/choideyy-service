import { sanitizeForLog } from "@/lib/sanitize";

export type LogLevel = "info" | "warn" | "error";

export type ContactLogFields = {
  requestId: string;
  timestamp: string;
  ip: string;
  success: boolean;
  statusCode?: number;
  reason?: string;
  userAgent?: string;
};

function escapeField(value: string): string {
  // Escape for structured log lines: no newlines / control chars.
  return sanitizeForLog(value, 500);
}

/**
 * Structured logger. Never logs secrets, passwords, or raw message bodies.
 */
export function logContactEvent(fields: ContactLogFields): void {
  const entry = {
    level: fields.success ? ("info" as LogLevel) : ("warn" as LogLevel),
    event: "contact_submission",
    requestId: escapeField(fields.requestId),
    timestamp: fields.timestamp,
    ip: escapeField(fields.ip),
    success: fields.success,
    ...(fields.statusCode !== undefined ? { statusCode: fields.statusCode } : {}),
    ...(fields.reason ? { reason: escapeField(fields.reason) } : {}),
    ...(fields.userAgent ? { userAgent: escapeField(fields.userAgent) } : {}),
  };

  const line = JSON.stringify(entry);

  if (fields.success) {
    console.info(line);
  } else {
    console.warn(line);
  }
}

export function logError(requestId: string, message: string): void {
  console.error(
    JSON.stringify({
      level: "error" as LogLevel,
      event: "contact_error",
      requestId: escapeField(requestId),
      timestamp: new Date().toISOString(),
      message: escapeField(message),
    }),
  );
}

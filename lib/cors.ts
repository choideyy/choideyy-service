/**
 * CORS helpers — only the configured frontend origin is allowed.
 */

function getAllowedOrigins(): string[] {
  const raw = process.env.FRONTEND_ORIGIN ?? process.env.ALLOWED_ORIGIN ?? "";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function resolveAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  const allowed = getAllowedOrigins();
  if (allowed.includes(requestOrigin)) {
    return requestOrigin;
  }
  return null;
}

export function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = resolveAllowedOrigin(requestOrigin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function isOriginAllowed(requestOrigin: string | null): boolean {
  // Allow server-to-server / curl without Origin (same-origin or non-browser).
  if (!requestOrigin) return true;
  return resolveAllowedOrigin(requestOrigin) !== null;
}

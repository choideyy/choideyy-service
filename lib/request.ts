import { randomUUID } from "crypto";

import { sanitizeForLog } from "@/lib/sanitize";

/** Max JSON body size accepted by the contact endpoint (bytes). */
export const MAX_BODY_BYTES = 32 * 1024; // 32 KiB

export function createRequestId(): string {
  return randomUUID();
}

/**
 * Resolve client IP from trusted proxy headers (Vercel) with fallbacks.
 * Never use untrusted spoofable headers alone without a platform proxy.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return sanitizeForLog(first, 64);
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return sanitizeForLog(realIp.trim(), 64);

  return "unknown";
}

export function getUserAgent(request: Request): string {
  const ua = request.headers.get("user-agent") ?? "unknown";
  return sanitizeForLog(ua, 300);
}

export function isJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type");
  if (!contentType) return false;
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

/**
 * Read and enforce body size before JSON.parse.
 * Returns raw text or a size-exceeded error marker.
 */
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; text: string } | { ok: false; reason: "too_large" | "empty" }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const length = Number.parseInt(contentLength, 10);
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
      return { ok: false, reason: "too_large" };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: false, reason: "empty" };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // ignore cancel errors
        }
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  }

  if (total === 0) {
    return { ok: false, reason: "empty" };
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, text: new TextDecoder("utf-8").decode(merged) };
}

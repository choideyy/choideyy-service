import { sendContactEmail } from "@/lib/email";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { logContactEvent, logError } from "@/lib/logger";
import { isOriginAllowed } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createRequestId,
  getClientIp,
  getUserAgent,
  isJsonContentType,
  readJsonBody,
} from "@/lib/request";
import { validateContactPayload } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rateLimitHeaders(result: ReturnType<typeof checkRateLimit>): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export async function OPTIONS(request: Request): Promise<Response> {
  const requestId = createRequestId();
  const origin = request.headers.get("origin");

  if (!isOriginAllowed(origin)) {
    return jsonResponse(
      { success: false, error: "Origin not allowed" },
      { status: 403, request, requestId },
    );
  }

  return optionsResponse(request, requestId);
}

export async function POST(request: Request): Promise<Response> {
  const requestId = createRequestId();
  const timestamp = new Date().toISOString();
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const origin = request.headers.get("origin");

  const fail = (
    status: number,
    error: string,
    reason: string,
    details?: Array<{ path: string; message: string }>,
    extraHeaders?: Record<string, string>,
  ): Response => {
    logContactEvent({
      requestId,
      timestamp,
      ip,
      success: false,
      statusCode: status,
      reason,
      userAgent,
    });

    return jsonResponse(details ? { success: false, error, details } : { success: false, error }, {
      status,
      request,
      requestId,
      extraHeaders,
    });
  };

  try {
    if (request.method !== "POST") {
      return fail(405, "Method not allowed", "method_not_allowed");
    }

    if (!isOriginAllowed(origin)) {
      return fail(403, "Origin not allowed", "origin_not_allowed");
    }

    if (!isJsonContentType(request)) {
      return fail(415, "Unsupported Media Type", "unsupported_content_type");
    }

    const rate = checkRateLimit(ip);
    const rlHeaders = rateLimitHeaders(rate);

    if (!rate.allowed) {
      return fail(429, "Too many requests", "rate_limited", undefined, {
        ...rlHeaders,
        "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
      });
    }

    const bodyResult = await readJsonBody(request);
    if (!bodyResult.ok) {
      if (bodyResult.reason === "too_large") {
        return fail(413, "Payload too large", "body_too_large", undefined, rlHeaders);
      }
      return fail(
        400,
        "Validation failed",
        "empty_body",
        [{ path: "body", message: "Request body is required" }],
        rlHeaders,
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(bodyResult.text);
    } catch {
      return fail(
        400,
        "Validation failed",
        "invalid_json",
        [{ path: "body", message: "Invalid JSON" }],
        rlHeaders,
      );
    }

    const validation = validateContactPayload(payload);
    if (!validation.success) {
      return fail(400, validation.error, "validation_failed", validation.details, rlHeaders);
    }

    await sendContactEmail(validation.data, {
      timestamp,
      clientIp: ip,
      userAgent,
      requestId,
    });

    logContactEvent({
      requestId,
      timestamp,
      ip,
      success: true,
      statusCode: 200,
      userAgent,
    });

    return jsonResponse(
      { success: true },
      { status: 200, request, requestId, extraHeaders: rlHeaders },
    );
  } catch (err) {
    // Never leak stack traces or secrets to clients.
    const message = err instanceof Error ? err.message : "unknown_error";
    logError(requestId, message);
    logContactEvent({
      requestId,
      timestamp,
      ip,
      success: false,
      statusCode: 500,
      reason: "internal_error",
      userAgent,
    });

    return jsonResponse(
      { success: false, error: "Internal server error" },
      { status: 500, request, requestId },
    );
  }
}

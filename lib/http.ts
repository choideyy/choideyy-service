import { corsHeaders } from "@/lib/cors";
import { securityHeaders } from "@/lib/security-headers";

export type ApiErrorBody = {
  success: false;
  error: string;
  details?: Array<{ path: string; message: string }>;
};

export type ApiSuccessBody = {
  success: true;
};

type JsonInit = {
  status: number;
  request: Request;
  requestId: string;
  extraHeaders?: Record<string, string>;
};

function baseHeaders(request: Request, requestId: string): Record<string, string> {
  const origin = request.headers.get("origin");
  return {
    ...securityHeaders(),
    ...corsHeaders(origin),
    "Content-Type": "application/json; charset=utf-8",
    "X-Request-Id": requestId,
  };
}

export function jsonResponse(
  body: ApiSuccessBody | ApiErrorBody,
  { status, request, requestId, extraHeaders }: JsonInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...baseHeaders(request, requestId),
      ...extraHeaders,
    },
  });
}

export function optionsResponse(request: Request, requestId: string): Response {
  return new Response(null, {
    status: 204,
    headers: baseHeaders(request, requestId),
  });
}

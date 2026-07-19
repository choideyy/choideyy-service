import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { corsHeaders, isOriginAllowed } from "@/lib/cors";
import { securityHeaders } from "@/lib/security-headers";

/**
 * Apply security headers and CORS preflight handling for /api/*.
 */
export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    if (!isOriginAllowed(origin)) {
      return NextResponse.json(
        { success: false, error: "Origin not allowed" },
        { status: 403, headers: { ...securityHeaders() } },
      );
    }

    return new NextResponse(null, {
      status: 204,
      headers: {
        ...securityHeaders(),
        ...corsHeaders(origin),
      },
    });
  }

  const response = NextResponse.next();
  const headers = securityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  // Strip potentially dangerous hop-by-hop / injection-prone custom headers from response path.
  response.headers.delete("X-Powered-By");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};

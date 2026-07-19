import { openApiDocument } from "@/lib/openapi";
import { securityHeaders } from "@/lib/security-headers";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  return new Response(JSON.stringify(openApiDocument, null, 2), {
    status: 200,
    headers: {
      ...securityHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

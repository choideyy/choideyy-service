import { securityHeaders } from "@/lib/security-headers";

export const runtime = "nodejs";
export const dynamic = "force-static";

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Choideyy Contact API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.22.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.22.0/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        tryItOutEnabled: true,
        persistAuthorization: false,
      });
    };
  </script>
</body>
</html>`;

export async function GET(): Promise<Response> {
  return new Response(SWAGGER_HTML, {
    status: 200,
    headers: {
      ...securityHeaders(),
      // Allow swagger-ui assets from unpkg while keeping a tight policy for this docs page.
      "Content-Security-Policy":
        "default-src 'none'; script-src 'unsafe-inline' https://unpkg.com; style-src 'unsafe-inline' https://unpkg.com; img-src data: https://unpkg.com; connect-src 'self'; font-src https://unpkg.com; base-uri 'none'; frame-ancestors 'none'",
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

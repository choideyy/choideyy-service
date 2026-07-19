import { describe, expect, it } from "vitest";

import { GET as getDocs } from "@/app/api/docs/route";
import { GET as getOpenApi } from "@/app/api/openapi.json/route";
import { openApiDocument } from "@/lib/openapi";

describe("documentation routes", () => {
  it("serves Swagger UI HTML", async () => {
    const res = await getDocs();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("swagger-ui");
    expect(html).toContain("/api/openapi.json");
  });

  it("serves OpenAPI JSON", async () => {
    const res = await getOpenApi();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const json = await res.json();
    expect(json.openapi).toBe(openApiDocument.openapi);
    expect(json.paths["/api/contact"]).toBeTruthy();
  });
});

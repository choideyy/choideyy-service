import { readFile } from "node:fs/promises";
import path from "node:path";

import SwaggerParser from "@apidevtools/swagger-parser";

async function main(): Promise<void> {
  const specPath = path.resolve(process.cwd(), "openapi/openapi.json");
  const raw = await readFile(specPath, "utf8");
  const doc = JSON.parse(raw) as object;

  // Dereference + validate structure against OpenAPI rules.
  await SwaggerParser.validate(doc as never);

  const parsed = doc as { openapi?: string; paths?: Record<string, unknown> };
  if (!parsed.openapi?.startsWith("3.")) {
    throw new Error(`Expected OpenAPI 3.x, got: ${parsed.openapi ?? "missing"}`);
  }

  const requiredPaths = ["/api/contact", "/api/openapi.json", "/api/docs"];
  for (const p of requiredPaths) {
    if (!parsed.paths?.[p]) {
      throw new Error(`OpenAPI spec missing required path: ${p}`);
    }
  }

  console.log("OpenAPI specification is valid.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

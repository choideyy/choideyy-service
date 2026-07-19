import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { openApiDocument } from "../lib/openapi";

async function main(): Promise<void> {
  const outDir = path.resolve(process.cwd(), "openapi");
  const outFile = path.join(outDir, "openapi.json");
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, `${JSON.stringify(openApiDocument, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { buildCaleonisOpenApiDocument } from "../apps/admin/src/lib/public-api/openapi";

// Writes the v1 OpenAPI document that the Mintlify API reference renders.
// A test in apps/admin fails when this file falls behind the zod schemas.
const target = fileURLToPath(new URL("../mintlify/api-reference/openapi.json", import.meta.url));
writeFileSync(target, `${JSON.stringify(buildCaleonisOpenApiDocument({ serverUrl: "https://receptionist.caleonis.com/api/v1" }), null, 2)}\n`);
console.log(`Wrote ${target}`);

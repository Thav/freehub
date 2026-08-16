import assert from "node:assert/strict";
import spec from "../openapi.json" with { type: "json" };
for (const path of ["/up", "/api/login", "/api/organizations/{organizationId}/people", "/api/organizations/{organizationId}/visits", "/api/organizations/{organizationId}/reports/people.csv"]) assert.ok(spec.paths[path], `OpenAPI lacks ${path}`);
assert.equal(spec.openapi, "3.0.3");
console.log(`OpenAPI valid: ${Object.keys(spec.paths).length} routes`);

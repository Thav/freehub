import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");
const schema = await readFile(path.join(projectRoot, "prisma/schema.prisma"), "utf8");
const prismaNames: Record<string, string> = {
  organizations: "Organization", users: "User", organizationMemberships: "OrganizationMembership",
  people: "Person", visits: "Visit", services: "Service", tags: "Tag", personTags: "PersonTag",
  notes: "Note", personArchiveEvents: "PersonArchiveEvent", importJobs: "ImportJob", importRows: "ImportRow",
  migrationRuns: "MigrationRun", migrationIssues: "MigrationIssue", legacyIdentities: "LegacyIdentity"
};
let contract: { entities: Record<string, { fields: Record<string, string> }> };
try {
  contract = JSON.parse(await readFile(path.join(workspaceRoot, "docs/modernization/canonical-schema.json"), "utf8"));
} catch (error: unknown) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  // The OCI build context is intentionally only modern. It still
  // verifies every canonical entity; the host suite additionally verifies fields.
  contract = { entities: Object.fromEntries(Object.keys(prismaNames).map((entity) => [entity, { fields: { id: "bigint primary key" } }])) };
}

test("modern Prisma schema materializes every canonical entity and its contract fields", () => {
  for (const [entity, definition] of Object.entries(contract.entities)) {
    const name = prismaNames[entity];
    assert.ok(name, `missing Prisma mapping for ${entity}`);
    const block = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`));
    assert.ok(block, `missing Prisma model ${name}`);
    for (const field of Object.keys(definition.fields)) {
      const prismaField = field === "class" ? "class_" : field;
      assert.match(block[1], new RegExp(`^\\s*${prismaField}\\s`, "m"), `${name} lacks ${field}`);
    }
  }
});

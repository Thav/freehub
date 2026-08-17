import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(projectRoot, "..");
const contract = JSON.parse(await readFile(path.join(workspaceRoot, "docs/modernization/canonical-schema.json"), "utf8"));
const artifact = await readFile(path.join(projectRoot, "prisma/schema.sql"), "utf8");
const tableNames = { organizations: "Organization", users: "User", organizationMemberships: "OrganizationMembership", people: "Person", visits: "Visit", services: "Service", tags: "Tag", personTags: "PersonTag", notes: "Note", personArchiveEvents: "PersonArchiveEvent", importJobs: "ImportJob", importRows: "ImportRow", migrationRuns: "MigrationRun", migrationIssues: "MigrationIssue", legacyIdentities: "LegacyIdentity" };

for (const [entity, definition] of Object.entries(contract.entities)) {
  const table = tableNames[entity];
  assert.match(artifact, new RegExp(`CREATE TABLE "public"\\."${table}"`), `missing table ${table}`);
  for (const field of Object.keys(definition.fields)) assert.match(artifact, new RegExp(`"${field}"`), `${table} lacks ${field}`);
}
for (const required of [
  "Visit_person_tenant_fkey", "Service_person_tenant_fkey", "PersonTag_person_tenant_fkey", "PersonTag_tag_tenant_fkey",
  "Note_person_tenant_fkey", "Note_visit_tenant_fkey", "Note_service_tenant_fkey", "PersonArchiveEvent_person_tenant_fkey",
  "PersonArchiveEvent_append_only", "Visit_contract_rules", "Organization_timezone_valid", "Person_active_search_idx",
  "Tag_organizationId_name_lower_unique", "visit_nonnegative_duration", "note_one_target"
]) assert.match(artifact, new RegExp(required), `missing canonical constraint or index ${required}`);
assert.match(artifact, /timestamp with time zone/, "timestamps must be timestamptz");
assert.match(artifact, /CREATE TYPE "public"\."ServiceType" AS ENUM \([\s\S]*'class'/, "service enum must contain class");
console.log(`canonical schema contract valid: ${Object.keys(contract.entities).length} entities`);

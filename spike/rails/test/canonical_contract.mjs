import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
const contract = JSON.parse(await readFile(path.join(root, "docs/modernization/canonical-schema.json"), "utf8"));
const migrations = await Promise.all([
  readFile(path.join(root, "spike/rails/db/migrate/20260816000000_create_spike_slice.rb"), "utf8"),
  readFile(path.join(root, "spike/rails/db/migrate/20260816000001_expand_to_canonical_contract.rb"), "utf8")
]);
const source = migrations.join("\n");
const tableNames = { organizationMemberships: "memberships", personTags: "person_tags", personArchiveEvents: "person_archive_events", importJobs: "import_jobs", importRows: "import_rows", migrationRuns: "migration_runs", migrationIssues: "migration_issues", legacyIdentities: "legacy_identities" };
const snake = (name) => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

for (const [entity, definition] of Object.entries(contract.entities)) {
  const table = tableNames[entity] || entity;
  assert.match(source, new RegExp(`(?:create_table|change_table) :${table}`), `missing ${table}`);
  for (const field of Object.keys(definition.fields)) {
    if (["id", "createdAt", "updatedAt"].includes(field)) continue;
    const column = snake(field);
    const reference = field.endsWith("Id") ? `:${column.slice(0, -3)}` : "";
    assert.ok(source.includes(`:${column}`) || (reference && source.includes(reference)), `${table} lacks ${column}`);
  }
}
console.log(`Rails migration declares all ${Object.keys(contract.entities).length} canonical entities`);
